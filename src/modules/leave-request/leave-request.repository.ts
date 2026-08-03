import { Pool, QueryResult } from 'pg';
import { pool } from '../../shared/db/connection';
import { LeaveRequest, CreateLeaveRequestDto } from './leave-request.model';
import { LeaveRequestStatus } from '../../shared/types';

export interface ILeaveRequestRepository {
  findById(id: string): Promise<LeaveRequest | null>;
  findByEmployee(employeeId: string): Promise<LeaveRequest[]>;
  findByStatus(status: LeaveRequestStatus): Promise<LeaveRequest[]>;
  create(dto: CreateLeaveRequestDto): Promise<LeaveRequest>;
  updateStatus(
    id: string,
    status: LeaveRequestStatus,
    approvedBy?: string | null,
    approvedAt?: Date | null,
  ): Promise<LeaveRequest>;
}

function rowToLeaveRequest(row: Record<string, unknown>): LeaveRequest {
  return {
    id: row.id as string,
    employeeId: row.employee_id as string,
    leavePolicyId: row.leave_policy_id as string,
    startDate: new Date(row.start_date as string),
    endDate: new Date(row.end_date as string),
    reason: (row.reason as string | null) ?? undefined,
    status: row.status as LeaveRequestStatus,
    approvedBy: (row.approved_by as string) ?? null,
    approvedAt: row.approved_at ? new Date(row.approved_at as string) : null,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };
}

export class LeaveRequestRepository implements ILeaveRequestRepository {
  private readonly db: Pool;

  constructor(dbPool: Pool = pool) {
    this.db = dbPool;
  }

  async findById(id: string): Promise<LeaveRequest | null> {
    try {
      const result: QueryResult = await this.db.query(
        'SELECT * FROM leave_requests WHERE id = $1',
        [id],
      );
      if (result.rows.length === 0) {
        return null;
      }
      return rowToLeaveRequest(result.rows[0] as Record<string, unknown>);
    } catch (error: unknown) {
      throw new Error(
        `Failed to find leave request by id: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async findByEmployee(employeeId: string): Promise<LeaveRequest[]> {
    try {
      const result: QueryResult = await this.db.query(
        'SELECT * FROM leave_requests WHERE employee_id = $1',
        [employeeId],
      );
      return (result.rows as Record<string, unknown>[]).map(rowToLeaveRequest);
    } catch (error: unknown) {
      throw new Error(
        `Failed to find leave requests by employee: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async findByStatus(status: LeaveRequestStatus): Promise<LeaveRequest[]> {
    try {
      const result: QueryResult = await this.db.query(
        'SELECT * FROM leave_requests WHERE status = $1',
        [status],
      );
      return (result.rows as Record<string, unknown>[]).map(rowToLeaveRequest);
    } catch (error: unknown) {
      throw new Error(
        `Failed to find leave requests by status: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async create(dto: CreateLeaveRequestDto): Promise<LeaveRequest> {
    try {
      const result: QueryResult = await this.db.query(
        `INSERT INTO leave_requests (employee_id, leave_policy_id, start_date, end_date, reason, status, approved_by, approved_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          dto.employeeId,
          dto.leavePolicyId,
          dto.startDate,
          dto.endDate,
          dto.reason ?? null,
          LeaveRequestStatus.DRAFT,
          null,
          null,
        ],
      );
      return rowToLeaveRequest(result.rows[0] as Record<string, unknown>);
    } catch (error: unknown) {
      throw new Error(
        `Failed to create leave request: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async updateStatus(
    id: string,
    status: LeaveRequestStatus,
    approvedBy?: string | null,
    approvedAt?: Date | null,
  ): Promise<LeaveRequest> {
    try {
      const result: QueryResult = await this.db.query(
        'UPDATE leave_requests SET status = $1, approved_by = $2, approved_at = $3, updated_at = NOW() WHERE id = $4 RETURNING *',
        [status, approvedBy ?? null, approvedAt ?? null, id],
      );
      return rowToLeaveRequest(result.rows[0] as Record<string, unknown>);
    } catch (error: unknown) {
      throw new Error(
        `Failed to update leave request status: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
