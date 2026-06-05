import type { Pool } from 'pg';
import pool from '../../shared/db/connection';
import { LeaveRequest, CreateLeaveRequestDto } from './leave.model';
import { LeaveStatus } from '../../shared/types';

/**
 * Interface for leave repository operations.
 */
export interface ILeaveRepository {
  createRequest(dto: CreateLeaveRequestDto): Promise<LeaveRequest>;
  findById(id: string): Promise<LeaveRequest | null>;
  findByEmployeeId(employeeId: string): Promise<LeaveRequest[]>;
  findPendingByManagerId(managerId: string): Promise<LeaveRequest[]>;
  updateStatus(id: string, status: LeaveStatus): Promise<void>;
}

/**
 * PostgreSQL implementation of the leave repository.
 */
export class PostgresLeaveRepository implements ILeaveRepository {
  constructor(private readonly pool: Pool = pool) {}

  async createRequest(dto: CreateLeaveRequestDto): Promise<LeaveRequest> {
    const { employeeId, leaveType, startDate, endDate, reason } = dto;
    const result = await this.pool.query<LeaveRequest>(
      `INSERT INTO leave_requests (employee_id, leave_type, start_date, end_date, reason, status, manager_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [employeeId, leaveType, startDate, endDate, reason, LeaveStatus.Pending, 'manager-id-placeholder']
    );
    return result.rows[0];
  }

  async findById(id: string): Promise<LeaveRequest | null> {
    const result = await this.pool.query<LeaveRequest>(
      `SELECT * FROM leave_requests WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  async findByEmployeeId(employeeId: string): Promise<LeaveRequest[]> {
    const result = await this.pool.query<LeaveRequest>(
      `SELECT * FROM leave_requests WHERE employee_id = $1`,
      [employeeId]
    );
    return result.rows;
  }

  async findPendingByManagerId(managerId: string): Promise<LeaveRequest[]> {
    const result = await this.pool.query<LeaveRequest>(
      `SELECT * FROM leave_requests WHERE manager_id = $1 AND status = $2`,
      [managerId, LeaveStatus.Pending]
    );
    return result.rows;
  }

  async updateStatus(id: string, status: LeaveStatus): Promise<void> {
    await this.pool.query(
      `UPDATE leave_requests SET status = $1 WHERE id = $2`,
      [status, id]
    );
  }
}
