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

  // Additional CRUD methods (find, update, delete) can be added here.
}