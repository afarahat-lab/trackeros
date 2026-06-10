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

  // Additional CRUD methods can be implemented here.
}
