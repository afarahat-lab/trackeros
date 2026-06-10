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

  // Additional CRUD methods will be implemented here...
}
