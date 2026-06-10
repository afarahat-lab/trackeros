// Leave repository for managing database operations related to leave requests

import type { Pool } from 'pg';
import pool from '../../shared/db/connection';
import { LeaveRequest } from './leave.model';

/**
 * LeaveRepository class for CRUD operations on LeaveRequest.
 */
export class LeaveRepository {
  constructor(private readonly db: Pool = pool) {}

  /**
   * Create a new leave request.
   * @param leaveRequest - The leave request to create.
   * @returns The created leave request.
   */
  async create(leaveRequest: LeaveRequest): Promise<LeaveRequest> {
    const result = await this.db.query(`INSERT INTO leave_requests (id, employeeId, leaveType, startDate, endDate, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`, [
      leaveRequest.id,
      leaveRequest.employeeId,
      leaveRequest.leaveType,
      leaveRequest.startDate,
      leaveRequest.endDate,
      leaveRequest.status,
    ]);
    return result.rows[0];
  }

  /**
   * Find a leave request by ID.
   * @param id - The ID of the leave request.
   * @returns The leave request if found.
   */
  async findById(id: string): Promise<LeaveRequest | null> {
    const result = await this.db.query(`SELECT * FROM leave_requests WHERE id = $1`, [id]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Update an existing leave request.
   * @param id - The ID of the leave request to update.
   * @param leaveRequest - The updated leave request data.
   * @returns The updated leave request.
   */
  async update(id: string, leaveRequest: LeaveRequest): Promise<LeaveRequest> {
    const result = await this.db.query(`UPDATE leave_requests SET employeeId = $1, leaveType = $2, startDate = $3, endDate = $4, status = $5 WHERE id = $6 RETURNING *`, [
      leaveRequest.employeeId,
      leaveRequest.leaveType,
      leaveRequest.startDate,
      leaveRequest.endDate,
      leaveRequest.status,
      id,
    ]);
    return result.rows[0];
  }

  /**
   * Delete a leave request by ID.
   * @param id - The ID of the leave request to delete.
   */
  async delete(id: string): Promise<void> {
    await this.db.query(`DELETE FROM leave_requests WHERE id = $1`, [id]);
  }
}