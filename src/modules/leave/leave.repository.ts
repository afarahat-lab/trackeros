// Leave Repository

import pool from '../../shared/db/connection';
import { LeaveRequest, CreateLeaveRequestDto } from './leave.model';

/**
 * LeaveRepository handles data access for leave requests.
 */
export class LeaveRepository {
  /**
   * Creates a new leave request in the database.
   * @param dto - The data transfer object for creating a leave request.
   * @returns The created leave request.
   */
  async create(dto: CreateLeaveRequestDto): Promise<LeaveRequest> {
    const { employeeId, leaveType, startDate, endDate, status } = dto;
    const result = await pool.query(
      'INSERT INTO leave_requests (employee_id, leave_type, start_date, end_date, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [employeeId, leaveType, startDate, endDate, status]
    );
    return result.rows[0];
  }

  /**
   * Retrieves a leave request by ID.
   * @param id - The ID of the leave request.
   * @returns The leave request.
   */
  async getById(id: string): Promise<LeaveRequest | null> {
    const result = await pool.query(
      'SELECT * FROM leave_requests WHERE id = $1',
      [id]
    );
    return result.rows.length ? result.rows[0] : null;
  }

  /**
   * Updates an existing leave request.
   * @param id - The ID of the leave request.
   * @param dto - The data transfer object for updating a leave request.
   * @returns The updated leave request.
   */
  async update(id: string, dto: Partial<CreateLeaveRequestDto>): Promise<LeaveRequest | null> {
    const { leaveType, startDate, endDate, status } = dto;
    const result = await pool.query(
      'UPDATE leave_requests SET leave_type = $1, start_date = $2, end_date = $3, status = $4 WHERE id = $5 RETURNING *',
      [leaveType, startDate, endDate, status, id]
    );
    return result.rows.length ? result.rows[0] : null;
  }

  /**
   * Deletes a leave request by ID.
   * @param id - The ID of the leave request.
   * @returns A message indicating the deletion status.
   */
  async delete(id: string): Promise<string> {
    await pool.query(
      'DELETE FROM leave_requests WHERE id = $1',
      [id]
    );
    return 'Leave request deleted successfully';
  }
}
