import { Pool } from 'pg';
import { pool } from '../../shared/db/connection';
import {
  LeaveRequest,
  CreateLeaveRequestDto,
  UpdateLeaveRequestDto,
  LeaveRequestStatus
} from './leave.model';

export interface ILeaveRequestRepository {
  create(dto: CreateLeaveRequestDto): Promise<LeaveRequest>;
  findById(id: string): Promise<LeaveRequest | null>;
  findByEmployeeId(employeeId: string): Promise<LeaveRequest[]>;
  findByManagerId(managerId: string): Promise<LeaveRequest[]>;
  updateStatus(id: string, status: LeaveRequestStatus, managerId?: string): Promise<LeaveRequest>;
}

export class LeaveRequestRepository implements ILeaveRequestRepository {
  constructor(private readonly db: Pool = pool) {}

  async create(dto: CreateLeaveRequestDto): Promise<LeaveRequest> {
    try {
      const client = await this.db.connect();
      try {
        const result = await client.query(
          `INSERT INTO leave_requests (employee_id, leave_type_id, start_date, end_date, days_requested, status, reason, manager_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           RETURNING *`,
          [
            dto.employeeId,
            dto.leaveTypeId,
            dto.startDate,
            dto.endDate,
            dto.daysRequested,
            LeaveRequestStatus.DRAFT,
            dto.reason || null,
            dto.managerId || null
          ]
        );

        const leaveRequest = this.mapRow(result.rows[0]);

        // Write audit log
        await client.query(
          `INSERT INTO audit_logs (entity_type, entity_id, action, details, created_at)
           VALUES ($1, $2, $3, $4, NOW())`,
          ['leave_request', leaveRequest.id, 'created', JSON.stringify({ employeeId: dto.employeeId, leaveTypeId: dto.leaveTypeId })]
        );

        return leaveRequest;
      } finally {
        client.release();
      }
    } catch (error) {
      throw new Error(`Failed to create leave request: ${(error as Error).message}`);
    }
  }

  async findById(id: string): Promise<LeaveRequest | null> {
    try {
      const result = await this.db.query(
        `SELECT * FROM leave_requests WHERE id = $1`,
        [id]
      );
      if (result.rows.length === 0) {
        return null;
      }
      return this.mapRow(result.rows[0]);
    } catch (error) {
      throw new Error(`Failed to find leave request by id: ${(error as Error).message}`);
    }
  }

  async findByEmployeeId(employeeId: string): Promise<LeaveRequest[]> {
    try {
      const result = await this.db.query(
        `SELECT * FROM leave_requests WHERE employee_id = $1 ORDER BY created_at DESC`,
        [employeeId]
      );
      return result.rows.map((row: any) => this.mapRow(row));
    } catch (error) {
      throw new Error(`Failed to find leave requests by employee: ${(error as Error).message}`);
    }
  }

  async findByManagerId(managerId: string): Promise<LeaveRequest[]> {
    try {
      const result = await this.db.query(
        `SELECT * FROM leave_requests WHERE manager_id = $1 ORDER BY created_at DESC`,
        [managerId]
      );
      return result.rows.map((row: any) => this.mapRow(row));
    } catch (error) {
      throw new Error(`Failed to find leave requests by manager: ${(error as Error).message}`);
    }
  }

  async updateStatus(id: string, status: LeaveRequestStatus, managerId?: string): Promise<LeaveRequest> {
    try {
      const client = await this.db.connect();
      try {
        const result = await client.query(
          `UPDATE leave_requests SET status = $1, manager_id = COALESCE($2, manager_id), updated_at = NOW()
           WHERE id = $3
           RETURNING *`,
          [status, managerId || null, id]
        );

        if (result.rows.length === 0) {
          throw new Error(`Leave request with id ${id} not found`);
        }

        const leaveRequest = this.mapRow(result.rows[0]);

        // Write audit log
        await client.query(
          `INSERT INTO audit_logs (entity_type, entity_id, action, details, created_at)
           VALUES ($1, $2, $3, $4, NOW())`,
          ['leave_request', leaveRequest.id, 'status_updated', JSON.stringify({ status, managerId: managerId || null })]
        );

        return leaveRequest;
      } finally {
        client.release();
      }
    } catch (error) {
      throw new Error(`Failed to update leave request status: ${(error as Error).message}`);
    }
  }

  private mapRow(row: any): LeaveRequest {
    return {
      id: row.id,
      employeeId: row.employee_id,
      leaveTypeId: row.leave_type_id,
      startDate: row.start_date,
      endDate: row.end_date,
      daysRequested: row.days_requested,
      status: row.status as LeaveRequestStatus,
      reason: row.reason,
      managerId: row.manager_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
