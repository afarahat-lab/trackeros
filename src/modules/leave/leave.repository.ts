
import { pool } from '../../shared/db/connection';
import {
  LeaveRequest,
  CreateLeaveRequestDto,
  UpdateLeaveRequestDto,
  LeaveRequestQueryParams,
} from './leave.model';
import { LeaveStatus } from '../../shared/types/leave.types';

export interface ILeaveRepository {
  findById(id: string): Promise<LeaveRequest | null>;
  findByEmployeeId(employeeId: string): Promise<LeaveRequest[]>;
  findByStatus(status: LeaveStatus): Promise<LeaveRequest[]>;
  findByQueryParams(params: LeaveRequestQueryParams): Promise<LeaveRequest[]>;
  create(dto: CreateLeaveRequestDto): Promise<LeaveRequest>;
  update(id: string, dto: UpdateLeaveRequestDto): Promise<LeaveRequest | null>;
  delete(id: string): Promise<boolean>;
}

export class LeaveRepository implements ILeaveRepository {
  async findById(id: string): Promise<LeaveRequest | null> {
    const result = await pool.query(
      'SELECT * FROM leave_requests WHERE id = $1',
      [id],
    );
    if (result.rows.length === 0) {
      return null;
    }
    return this.mapRowToLeaveRequest(result.rows[0]);
  }

  async findByEmployeeId(employeeId: string): Promise<LeaveRequest[]> {
    const result = await pool.query(
      'SELECT * FROM leave_requests WHERE employee_id = $1 ORDER BY created_at DESC',
      [employeeId],
    );
    return result.rows.map((row) => this.mapRowToLeaveRequest(row));
  }

  async findByStatus(status: LeaveStatus): Promise<LeaveRequest[]> {
    const result = await pool.query(
      'SELECT * FROM leave_requests WHERE status = $1 ORDER BY created_at DESC',
      [status],
    );
    return result.rows.map((row) => this.mapRowToLeaveRequest(row));
  }

  async findByQueryParams(params: LeaveRequestQueryParams): Promise<LeaveRequest[]> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (params.employeeId) {
      conditions.push(`employee_id = $${paramIndex++}`);
      values.push(params.employeeId);
    }

    if (params.status) {
      conditions.push(`status = $${paramIndex++}`);
      values.push(params.status);
    }

    if (params.startDate) {
      conditions.push(`start_date >= $${paramIndex++}`);
      values.push(params.startDate);
    }

    if (params.endDate) {
      conditions.push(`end_date <= $${paramIndex++}`);
      values.push(params.endDate);
    }

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    const result = await pool.query(
      `SELECT * FROM leave_requests ${whereClause} ORDER BY created_at DESC`,
      values,
    );
    return result.rows.map((row) => this.mapRowToLeaveRequest(row));
  }

  async create(dto: CreateLeaveRequestDto): Promise<LeaveRequest> {
    const result = await pool.query(
      `INSERT INTO leave_requests (employee_id, leave_type_id, start_date, end_date, reason, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        dto.employeeId,
        dto.leaveTypeId,
        dto.startDate,
        dto.endDate,
        dto.reason ?? null,
        LeaveStatus.PENDING,
      ],
    );
    return this.mapRowToLeaveRequest(result.rows[0]);
  }

  async update(id: string, dto: UpdateLeaveRequestDto): Promise<LeaveRequest | null> {
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    const fieldMap: Record<string, string> = {
      status: 'status',
      approvedBy: 'approved_by',
      approvedAt: 'approved_at',
      rejectedBy: 'rejected_by',
      rejectedAt: 'rejected_at',
      rejectionReason: 'rejection_reason',
      cancelledBy: 'cancelled_by',
      cancelledAt: 'cancelled_at',
      cancellationReason: 'cancellation_reason',
    };

    for (const [key, column] of Object.entries(fieldMap)) {
      if (key in dto) {
        setClauses.push(`${column} = $${paramIndex++}`);
        values.push((dto as Record<string, unknown>)[key]);
      }
    }

    if (setClauses.length === 0) {
      return null;
    }

    setClauses.push(`updated_at = NOW()`);
    values.push(id);

    const result = await pool.query(
      `UPDATE leave_requests SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values,
    );

    if (result.rows.length === 0) {
      return null;
    }
    return this.mapRowToLeaveRequest(result.rows[0]);
  }

  async delete(id: string): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM leave_requests WHERE id = $1',
      [id],
    );
    return (result.rowCount ?? 0) > 0;
  }

  private mapRowToLeaveRequest(row: Record<string, unknown>): LeaveRequest {
    return {
      id: row.id as string,
      employeeId: row.employee_id as string,
      leaveTypeId: row.leave_type_id as string,
      startDate: row.start_date as Date,
      endDate: row.end_date as Date,
      reason: row.reason as string | undefined,
      status: row.status as LeaveStatus,
      approvedBy: row.approved_by as string | null,
      approvedAt: row.approved_at as Date | null,
      rejectedBy: row.rejected_by as string | null,
      rejectedAt: row.rejected_at as Date | null,
      rejectionReason: row.rejection_reason as string | null,
      cancelledBy: row.cancelled_by as string | null,
      cancelledAt: row.cancelled_at as Date | null,
      cancellationReason: row.cancellation_reason as string | null,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
    };
  }
}
