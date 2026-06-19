import pool from '../../shared/db/connection';
import { ILeaveRepository } from './leave.repository';
import { LeaveRequest } from './leave.model';
import { LeaveStatus } from '../../shared/types';

function mapRow(row: any): LeaveRequest {
  return {
    id: row.id,
    employeeId: row.employee_id,
    leaveType: row.leave_type,
    startDate: new Date(row.start_date),
    endDate: new Date(row.end_date),
    status: row.status,
    reason: row.reason,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export class LeaveRepository implements ILeaveRepository {
  async create(request: Omit<LeaveRequest, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeaveRequest> {
    const { employeeId, leaveType, startDate, endDate, status, reason } = request;
    const result = await pool.query(
      `INSERT INTO leave_requests (employee_id, leave_type, start_date, end_date, status, reason)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [employeeId, leaveType, startDate, endDate, status, reason ?? null]
    );
    return mapRow(result.rows[0]);
  }

  async findById(id: number): Promise<LeaveRequest | null> {
    const result = await pool.query('SELECT * FROM leave_requests WHERE id = $1', [id]);
    if (result.rows.length === 0) return null;
    return mapRow(result.rows[0]);
  }

  async findByEmployeeId(employeeId: number): Promise<LeaveRequest[]> {
    const result = await pool.query('SELECT * FROM leave_requests WHERE employee_id = $1', [employeeId]);
    return result.rows.map(mapRow);
  }

  async updateStatus(id: number, status: LeaveStatus): Promise<LeaveRequest | null> {
    const result = await pool.query(
      `UPDATE leave_requests SET status = $2, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, status]
    );
    if (result.rows.length === 0) return null;
    return mapRow(result.rows[0]);
  }

  async delete(id: number): Promise<boolean> {
    const result = await pool.query('DELETE FROM leave_requests WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }
}
