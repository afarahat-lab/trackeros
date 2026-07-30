import { pool } from '../../shared/db/connection';
import { LeaveRequest } from './leave.model';
import { ILeaveRequestRepository } from './leave.repository.interface';
import { LeaveRequestStatus } from '../../shared/types/index';

export class PgLeaveRequestRepository implements ILeaveRequestRepository {
  private static readonly VALID_STATUSES: ReadonlySet<string> = new Set(
    Object.values(LeaveRequestStatus)
  );

  async findById(id: string): Promise<LeaveRequest | null> {
    try {
      const result = await pool.query(
        `SELECT id, employee_id, leave_policy_id, start_date, end_date, reason,
                status, approved_by, approved_at, created_at, updated_at
         FROM leave_requests
         WHERE id = $1`,
        [id]
      );
      if (result.rows.length === 0) return null;
      return this.mapRowToRequest(result.rows[0]);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to find leave request by id: ${message}`);
    }
  }

  async findByEmployee(employeeId: string): Promise<LeaveRequest[]> {
    try {
      const result = await pool.query(
        `SELECT id, employee_id, leave_policy_id, start_date, end_date, reason,
                status, approved_by, approved_at, created_at, updated_at
         FROM leave_requests
         WHERE employee_id = $1
         ORDER BY start_date DESC`,
        [employeeId]
      );
      return result.rows.map(row => this.mapRowToRequest(row));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to find leave requests by employee: ${message}`);
    }
  }

  async findByStatus(status: LeaveRequestStatus): Promise<LeaveRequest[]> {
    try {
      const result = await pool.query(
        `SELECT id, employee_id, leave_policy_id, start_date, end_date, reason,
                status, approved_by, approved_at, created_at, updated_at
         FROM leave_requests
         WHERE status = $1
         ORDER BY start_date DESC`,
        [status]
      );
      return result.rows.map(row => this.mapRowToRequest(row));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to find leave requests by status: ${message}`);
    }
  }

  async create(
    request: Omit<LeaveRequest, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<LeaveRequest> {
    try {
      const result = await pool.query(
        `INSERT INTO leave_requests (employee_id, leave_policy_id, start_date, end_date, reason, status, approved_by, approved_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, employee_id, leave_policy_id, start_date, end_date, reason, status, approved_by, approved_at, created_at, updated_at`,
        [
          request.employeeId,
          request.leavePolicyId,
          request.startDate,
          request.endDate,
          request.reason ?? null,
          request.status,
          request.approvedBy ?? null,
          request.approvedAt ?? null,
        ]
      );
      return this.mapRowToRequest(result.rows[0]);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to create leave request: ${message}`);
    }
  }

  async update(id: string, data: Partial<LeaveRequest>): Promise<LeaveRequest | null> {
    try {
      const setClauses: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      if (data.employeeId !== undefined) {
        setClauses.push(`employee_id = $${paramIndex++}`);
        values.push(data.employeeId);
      }
      if (data.leavePolicyId !== undefined) {
        setClauses.push(`leave_policy_id = $${paramIndex++}`);
        values.push(data.leavePolicyId);
      }
      if (data.startDate !== undefined) {
        setClauses.push(`start_date = $${paramIndex++}`);
        values.push(data.startDate);
      }
      if (data.endDate !== undefined) {
        setClauses.push(`end_date = $${paramIndex++}`);
        values.push(data.endDate);
      }
      if (data.reason !== undefined) {
        setClauses.push(`reason = $${paramIndex++}`);
        values.push(data.reason ?? null);
      }
      if (data.status !== undefined) {
        setClauses.push(`status = $${paramIndex++}`);
        values.push(data.status);
      }
      if (data.approvedBy !== undefined) {
        setClauses.push(`approved_by = $${paramIndex++}`);
        values.push(data.approvedBy ?? null);
      }
      if (data.approvedAt !== undefined) {
        setClauses.push(`approved_at = $${paramIndex++}`);
        values.push(data.approvedAt ?? null);
      }

      if (setClauses.length === 0) {
        return null;
      }

      setClauses.push(`updated_at = NOW()`);
      values.push(id);

      const result = await pool.query(
        `UPDATE leave_requests SET ${setClauses.join(', ')} WHERE id = $${paramIndex}
         RETURNING id, employee_id, leave_policy_id, start_date, end_date, reason, status, approved_by, approved_at, created_at, updated_at`,
        values
      );

      if (result.rows.length === 0) return null;
      return this.mapRowToRequest(result.rows[0]);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to update leave request: ${message}`);
    }
  }

  private mapRowToRequest(row: Record<string, unknown>): LeaveRequest {
    const rawStatus = row.status as string;
    if (!PgLeaveRequestRepository.VALID_STATUSES.has(rawStatus)) {
      throw new Error(`Invalid leave request status from database: ${rawStatus}`);
    }
    return {
      id: row.id as string,
      employeeId: row.employee_id as string,
      leavePolicyId: row.leave_policy_id as string,
      startDate: new Date(row.start_date as string),
      endDate: new Date(row.end_date as string),
      reason: row.reason as string | undefined,
      status: rawStatus as LeaveRequestStatus,
      approvedBy: row.approved_by as string | null,
      approvedAt: row.approved_at ? new Date(row.approved_at as string) : null,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }
}
