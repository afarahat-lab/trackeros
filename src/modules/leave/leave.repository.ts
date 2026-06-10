import type { Pool } from 'pg';
import pool from '../../shared/db/connection';
import { LeaveRequest, CreateLeaveRequestDto } from './leave.model';

/**
 * Leave Repository for managing leave requests.
 */
export class LeaveRepository {
  constructor(private readonly db: Pool = pool) {}

  /**
   * Create a new leave request.
   * @param dto - The data transfer object for creating a leave request.
   * @returns The created leave request.
   */
  async create(dto: CreateLeaveRequestDto): Promise<LeaveRequest> {
    const { employeeId, leaveType, startDate, endDate, status } = dto;
    const result = await this.db.query<LeaveRequest>(
      'INSERT INTO leave_requests (employeeId, leaveType, startDate, endDate, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [employeeId, leaveType, startDate, endDate, status]
    );
    return result.rows[0];
  }

  /**
   * Retrieve a leave request by ID.
   * @param id - The ID of the leave request.
   * @returns The leave request.
   */
  async findById(id: string): Promise<LeaveRequest | null> {
    const result = await this.db.query<LeaveRequest>(
      'SELECT * FROM leave_requests WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  /**
   * Update an existing leave request.
   * @param id - The ID of the leave request.
   * @param dto - The data transfer object for updating a leave request.
   * @returns The updated leave request.
   */
  async update(id: string, dto: CreateLeaveRequestDto): Promise<LeaveRequest> {
    const { employeeId, leaveType, startDate, endDate, status } = dto;
    const result = await this.db.query<LeaveRequest>(
      'UPDATE leave_requests SET employeeId = $1, leaveType = $2, startDate = $3, endDate = $4, status = $5 WHERE id = $6 RETURNING *',
      [employeeId, leaveType, startDate, endDate, status, id]
    );
    return result.rows[0];
  }

  /**
   * Delete a leave request by ID.
   * @param id - The ID of the leave request.
   */
  async delete(id: string): Promise<void> {
    await this.db.query('DELETE FROM leave_requests WHERE id = $1', [id]);
  }
}