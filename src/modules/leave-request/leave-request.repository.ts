import { PoolClient } from 'pg';
import { pool } from '../../shared/db/connection';
import { LeaveRequest } from './leave-request.model';
import { LeaveRequestStatus } from '../../shared/types/leave.types';
import { UniqueConstraintViolationError } from '../employee/employee.repository';

export interface ILeaveRequestRepository {
  findById(id: string, client?: PoolClient): Promise<LeaveRequest | null>;

  findByEmployeeId(
    employeeId: string,
    client?: PoolClient,
  ): Promise<LeaveRequest[]>;

  findOverlapping(
    employeeId: string,
    startDate: Date,
    endDate: Date,
    client?: PoolClient,
  ): Promise<LeaveRequest[]>;

  create(
    input: Omit<LeaveRequest, 'id' | 'createdAt' | 'updatedAt'>,
    client?: PoolClient,
  ): Promise<LeaveRequest>;

  updateStatus(
    id: string,
    status: LeaveRequestStatus,
    client?: PoolClient,
  ): Promise<LeaveRequest | null>;

  approveRequest(
    id: string,
    approvedBy: string,
    client?: PoolClient,
  ): Promise<LeaveRequest | null>;

  findAllPendingByManagerId(
    managerId: string,
    client?: PoolClient,
  ): Promise<LeaveRequest[]>;
}

export class PgLeaveRequestRepository implements ILeaveRequestRepository {
  async findById(
    id: string,
    client?: PoolClient,
  ): Promise<LeaveRequest | null> {
    const db = client ?? pool;
    const result = await db.query(
      'SELECT * FROM leave_requests WHERE id = $1',
      [id],
    );
    if (result.rows.length === 0) {
      return null;
    }
    return this.rowToLeaveRequest(result.rows[0]);
  }

  async findByEmployeeId(
    employeeId: string,
    client?: PoolClient,
  ): Promise<LeaveRequest[]> {
    const db = client ?? pool;
    const result = await db.query(
      'SELECT * FROM leave_requests WHERE employee_id = $1 ORDER BY created_at DESC',
      [employeeId],
    );
    return result.rows.map((row) => this.rowToLeaveRequest(row));
  }

  async findOverlapping(
    employeeId: string,
    startDate: Date,
    endDate: Date,
    client?: PoolClient,
  ): Promise<LeaveRequest[]> {
    const db = client ?? pool;
    const result = await db.query(
      `SELECT * FROM leave_requests
       WHERE employee_id = $1
         AND status IN ($4, $5)
         AND start_date <= $3
         AND end_date >= $2`,
      [
        employeeId,
        startDate,
        endDate,
        LeaveRequestStatus.SUBMITTED,
        LeaveRequestStatus.APPROVED,
      ],
    );
    return result.rows.map((row) => this.rowToLeaveRequest(row));
  }

  async create(
    input: Omit<LeaveRequest, 'id' | 'createdAt' | 'updatedAt'>,
    client?: PoolClient,
  ): Promise<LeaveRequest> {
    const db = client ?? pool;
    try {
      const result = await db.query(
        `INSERT INTO leave_requests (
          employee_id, leave_type, start_date, end_date,
          reason, status, approved_by, approved_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [
          input.employeeId,
          input.leaveType,
          input.startDate,
          input.endDate,
          input.reason ?? null,
          input.status,
          input.approvedBy ?? null,
          input.approvedAt ?? null,
        ],
      );
      return this.rowToLeaveRequest(result.rows[0]);
    } catch (error: unknown) {
      if (this.isUniqueViolation(error)) {
        throw new UniqueConstraintViolationError(
          'Unique constraint violation on leave_requests',
          error,
        );
      }
      throw error;
    }
  }

  async updateStatus(
    id: string,
    status: LeaveRequestStatus,
    client?: PoolClient,
  ): Promise<LeaveRequest | null> {
    const db = client ?? pool;
    const result = await db.query(
      `UPDATE leave_requests
       SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [status, id],
    );
    if (result.rows.length === 0) {
      return null;
    }
    return this.rowToLeaveRequest(result.rows[0]);
  }

  async approveRequest(
    id: string,
    approvedBy: string,
    client?: PoolClient,
  ): Promise<LeaveRequest | null> {
    const db = client ?? pool;
    const result = await db.query(
      `UPDATE leave_requests
       SET status = $1, approved_by = $2, approved_at = NOW(), updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [LeaveRequestStatus.APPROVED, approvedBy, id],
    );
    if (result.rows.length === 0) {
      return null;
    }
    return this.rowToLeaveRequest(result.rows[0]);
  }

  async findAllPendingByManagerId(
    managerId: string,
    client?: PoolClient,
  ): Promise<LeaveRequest[]> {
    const db = client ?? pool;
    const result = await db.query(
      `SELECT lr.* FROM leave_requests lr
       INNER JOIN employees e ON lr.employee_id = e.id
       WHERE e.manager_id = $1
         AND lr.status = $2
       ORDER BY lr.created_at DESC`,
      [managerId, LeaveRequestStatus.SUBMITTED],
    );
    return result.rows.map((row) => this.rowToLeaveRequest(row));
  }

  private rowToLeaveRequest(row: Record<string, unknown>): LeaveRequest {
    return {
      id: row.id as string,
      employeeId: row.employee_id as string,
      leaveType: row.leave_type as LeaveRequest['leaveType'],
      startDate: new Date(row.start_date as string),
      endDate: new Date(row.end_date as string),
      reason: (row.reason as string | undefined) ?? undefined,
      status: row.status as LeaveRequestStatus,
      approvedBy: (row.approved_by as string | null) ?? null,
      approvedAt: row.approved_at
        ? new Date(row.approved_at as string)
        : null,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as Record<string, unknown>).code === '23505'
    );
  }
}
