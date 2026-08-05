import { PoolClient } from 'pg';
import { pool } from '../../shared/db/connection';
import { LeaveRequest } from './leave-request.model';
import { LeaveRequestStatus } from '../../shared/types/leave-request-status.enum';

export interface UpdateStatusMetadata {
  actorId: string;
}

export interface ILeaveRequestRepository {
  findById(id: string): Promise<LeaveRequest | null>;
  findByEmployeeId(employeeId: string): Promise<LeaveRequest[]>;
  findByStatus(status: LeaveRequestStatus): Promise<LeaveRequest[]>;
  findByEmployeeAndStatus(employeeId: string, status: LeaveRequestStatus): Promise<LeaveRequest[]>;
  findPendingForManager(managerId: string): Promise<LeaveRequest[]>;
  save(request: LeaveRequest): Promise<LeaveRequest>;
  update(id: string, partial: Partial<LeaveRequest>): Promise<LeaveRequest | null>;
  updateStatus(id: string, status: LeaveRequestStatus, metadata: UpdateStatusMetadata, client?: PoolClient): Promise<LeaveRequest | null>;
}

export class PgLeaveRequestRepository implements ILeaveRequestRepository {
  async findById(id: string): Promise<LeaveRequest | null> {
    const result = await pool.query(
      'SELECT * FROM leave_requests WHERE id = $1',
      [id]
    );
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  async findByEmployeeId(employeeId: string): Promise<LeaveRequest[]> {
    const result = await pool.query(
      'SELECT * FROM leave_requests WHERE employee_id = $1',
      [employeeId]
    );
    return result.rows.map((row: Record<string, unknown>) => this.mapRow(row));
  }

  async findByStatus(status: LeaveRequestStatus): Promise<LeaveRequest[]> {
    const result = await pool.query(
      'SELECT * FROM leave_requests WHERE status = $1',
      [status]
    );
    return result.rows.map((row: Record<string, unknown>) => this.mapRow(row));
  }

  async findByEmployeeAndStatus(employeeId: string, status: LeaveRequestStatus): Promise<LeaveRequest[]> {
    const result = await pool.query(
      'SELECT * FROM leave_requests WHERE employee_id = $1 AND status = $2',
      [employeeId, status]
    );
    return result.rows.map((row: Record<string, unknown>) => this.mapRow(row));
  }

  async findPendingForManager(managerId: string): Promise<LeaveRequest[]> {
    const result = await pool.query(
      `SELECT lr.* FROM leave_requests lr
       INNER JOIN employees e ON lr.employee_id = e.id
       WHERE e.manager_id = $1 AND lr.status = 'SUBMITTED' AND e.deleted_at IS NULL`,
      [managerId]
    );
    return result.rows.map((row: Record<string, unknown>) => this.mapRow(row));
  }

  async save(request: LeaveRequest): Promise<LeaveRequest> {
    const result = await pool.query(
      `INSERT INTO leave_requests (id, employee_id, leave_policy_id, start_date, end_date, reason, status, approved_by, approved_at, cancelled_by, cancelled_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        request.id,
        request.employeeId,
        request.leavePolicyId,
        request.startDate,
        request.endDate,
        request.reason ?? null,
        request.status,
        request.approvedBy,
        request.approvedAt,
        request.cancelledBy,
        request.cancelledAt,
        request.createdAt,
        request.updatedAt,
      ]
    );
    return this.mapRow(result.rows[0]);
  }

  async update(id: string, partial: Partial<LeaveRequest>): Promise<LeaveRequest | null> {
    const existing = await this.findById(id);
    if (!existing) {
      return null;
    }

    const merged = { ...existing, ...partial, id, updatedAt: new Date() };
    const result = await pool.query(
      `UPDATE leave_requests SET
        employee_id = $1, leave_policy_id = $2, start_date = $3, end_date = $4,
        reason = $5, status = $6, approved_by = $7, approved_at = $8,
        cancelled_by = $9, cancelled_at = $10, created_at = $11, updated_at = $12
       WHERE id = $13
       RETURNING *`,
      [
        merged.employeeId,
        merged.leavePolicyId,
        merged.startDate,
        merged.endDate,
        merged.reason ?? null,
        merged.status,
        merged.approvedBy,
        merged.approvedAt,
        merged.cancelledBy,
        merged.cancelledAt,
        merged.createdAt,
        merged.updatedAt,
        id,
      ]
    );
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  async updateStatus(
    id: string,
    status: LeaveRequestStatus,
    metadata: UpdateStatusMetadata,
    client?: PoolClient
  ): Promise<LeaveRequest | null> {
    const db = client ?? pool;
    const now = new Date();

    let approvedBy: string | null = null;
    let approvedAt: Date | null = null;
    let cancelledBy: string | null = null;
    let cancelledAt: Date | null = null;

    if (status === LeaveRequestStatus.APPROVED) {
      approvedBy = metadata.actorId;
      approvedAt = now;
    } else if (status === LeaveRequestStatus.CANCELLED) {
      cancelledBy = metadata.actorId;
      cancelledAt = now;
    }

    const result = await db.query(
      `UPDATE leave_requests SET
        status = $2, approved_by = $3, approved_at = $4,
        cancelled_by = $5, cancelled_at = $6, updated_at = $7
       WHERE id = $1
       RETURNING *`,
      [id, status, approvedBy, approvedAt, cancelledBy, cancelledAt, now]
    );
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  private mapRow(row: Record<string, unknown>): LeaveRequest {
    return {
      id: row.id as string,
      employeeId: row.employee_id as string,
      leavePolicyId: row.leave_policy_id as string,
      startDate: row.start_date as Date,
      endDate: row.end_date as Date,
      reason: (row.reason as string | undefined) ?? undefined,
      status: row.status as LeaveRequestStatus,
      approvedBy: row.approved_by as string | null,
      approvedAt: row.approved_at as Date | null,
      cancelledBy: row.cancelled_by as string | null,
      cancelledAt: row.cancelled_at as Date | null,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
    };
  }
}
