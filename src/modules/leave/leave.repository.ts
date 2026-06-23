import { Pool, PoolClient } from 'pg';
import { BaseRepository } from '../../shared/base-repository';
import {
  LeaveRequest,
  LeaveRequestStatus,
  LeaveRequestQueryParams,
  AuditAction
} from '../../shared/types/index';
import { isValidTransition } from './leave.model';

export interface ILeaveRequestRepository extends BaseRepository<LeaveRequest> {
  findByEmployee(employeeId: string, queryParams: LeaveRequestQueryParams): Promise<LeaveRequest[]>;
  findByApprover(approverId: string): Promise<LeaveRequest[]>;
  findPending(): Promise<LeaveRequest[]>;
  updateStatus(id: string, status: LeaveRequestStatus, approvedBy?: string, approvedAt?: Date): Promise<LeaveRequest>;
}

export class PgLeaveRequestRepository extends BaseRepository<LeaveRequest> implements ILeaveRequestRepository {
  constructor(pool: Pool) {
    super(pool);
  }

  async findById(id: string, client?: PoolClient): Promise<LeaveRequest | null> {
    const executor = client || this.pool;
    const res = await executor.query('SELECT * FROM leave_requests WHERE id = $1', [id]);
    return res.rows[0] || null;
  }

  async findAll(filters?: Record<string, any>, client?: PoolClient): Promise<LeaveRequest[]> {
    const executor = client || this.pool;
    const res = await executor.query('SELECT * FROM leave_requests');
    return res.rows;
  }

  async create(entity: Omit<LeaveRequest, 'id' | 'createdAt' | 'updatedAt'>, client?: PoolClient): Promise<LeaveRequest> {
    const isExternalClient = !!client;
    const executor = client || await this.pool.connect();
    
    try {
      if (!isExternalClient) await executor.query('BEGIN');

      const res = await executor.query(
        `INSERT INTO leave_requests (employee_id, leave_type_id, start_date, end_date, reason, status, approved_by, approved_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [entity.employeeId, entity.leaveTypeId, entity.startDate, entity.endDate, entity.reason, entity.status, entity.approvedBy, entity.approvedAt]
      );
      const leaveRequest = res.rows[0];

      await executor.query(
        `INSERT INTO audit_records (entity_type, entity_id, action, new_values, performed_by)
         VALUES ($1, $2, $3, $4, $5)`,
        ['LeaveRequest', leaveRequest.id, AuditAction.CREATE, JSON.stringify(leaveRequest), leaveRequest.employeeId]
      );

      if (!isExternalClient) await executor.query('COMMIT');
      return leaveRequest;
    } catch (error) {
      if (!isExternalClient) await executor.query('ROLLBACK');
      throw error;
    } finally {
      if (!isExternalClient) executor.release();
    }
  }

  async update(id: string, updates: Partial<LeaveRequest>, client?: PoolClient): Promise<LeaveRequest> {
    const executor = client || this.pool;
    const res = await executor.query('UPDATE leave_requests SET updated_at = NOW() WHERE id = $1 RETURNING *', [id]);
    return res.rows[0];
  }

  async delete(id: string, client?: PoolClient): Promise<void> {
    const executor = client || this.pool;
    await executor.query('DELETE FROM leave_requests WHERE id = $1', [id]);
  }

  async findByEmployee(employeeId: string, queryParams: LeaveRequestQueryParams): Promise<LeaveRequest[]> {
    let query = 'SELECT * FROM leave_requests WHERE employee_id = $1';
    const values: any[] = [employeeId];
    let paramIndex = 2;

    if (queryParams.status) {
      query += ` AND status = $${paramIndex++}`;
      values.push(queryParams.status);
    }
    if (queryParams.startDate) {
      query += ` AND start_date >= $${paramIndex++}`;
      values.push(queryParams.startDate);
    }
    if (queryParams.endDate) {
      query += ` AND end_date <= $${paramIndex++}`;
      values.push(queryParams.endDate);
    }
    if (queryParams.leaveTypeId) {
      query += ` AND leave_type_id = $${paramIndex++}`;
      values.push(queryParams.leaveTypeId);
    }

    const res = await this.pool.query(query, values);
    return res.rows;
  }

  async findByApprover(approverId: string): Promise<LeaveRequest[]> {
    const res = await this.pool.query('SELECT * FROM leave_requests WHERE approved_by = $1', [approverId]);
    return res.rows;
  }

  async findPending(): Promise<LeaveRequest[]> {
    const res = await this.pool.query("SELECT * FROM leave_requests WHERE status = $1", [LeaveRequestStatus.SUBMITTED]);
    return res.rows;
  }

  async updateStatus(id: string, status: LeaveRequestStatus, approvedBy?: string, approvedAt?: Date): Promise<LeaveRequest> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      
      const currentRequest = await this.findById(id, client);
      if (!currentRequest) {
        throw new Error('Leave request not found');
      }

      if (!isValidTransition(currentRequest.status, status)) {
        throw new Error(`Invalid transition from ${currentRequest.status} to ${status}`);
      }

      const res = await client.query(
        `UPDATE leave_requests SET status = $1, approved_by = $2, approved_at = $3, updated_at = NOW() WHERE id = $4 RETURNING *`,
        [status, approvedBy, approvedAt, id]
      );
      const updatedRequest = res.rows[0];

      let auditAction: AuditAction;
      switch (status) {
        case LeaveRequestStatus.SUBMITTED: auditAction = AuditAction.SUBMIT; break;
        case LeaveRequestStatus.APPROVED: auditAction = AuditAction.APPROVE; break;
        case LeaveRequestStatus.REJECTED: auditAction = AuditAction.REJECT; break;
        case LeaveRequestStatus.CANCELLED: auditAction = AuditAction.CANCEL; break;
        default: throw new Error('Unsupported status for audit');
      }

      await client.query(
        `INSERT INTO audit_records (entity_type, entity_id, action, old_values, new_values, performed_by)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        ['LeaveRequest', id, auditAction, JSON.stringify(currentRequest), JSON.stringify(updatedRequest), approvedBy || currentRequest.employeeId]
      );

      await client.query('COMMIT');
      return updatedRequest;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
