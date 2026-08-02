import { randomUUID } from 'crypto';
import { pool } from '../../shared/db/connection';
import type { LeaveRequest } from './leave.model';
import type { LeaveRequestStatus } from '../../shared/types/enums';

interface LeaveRequestRow {
  id: string;
  employee_id: string;
  leave_policy_id: string;
  start_date: Date;
  end_date: Date;
  reason: string | null;
  status: string;
  approved_by: string | null;
  approved_at: Date | null;
  rejected_by: string | null;
  rejected_at: Date | null;
  rejection_reason: string | null;
  cancelled_by: string | null;
  cancelled_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

function rowToLeaveRequest(row: LeaveRequestRow): LeaveRequest {
  return {
    id: row.id,
    employeeId: row.employee_id,
    leavePolicyId: row.leave_policy_id,
    startDate: row.start_date,
    endDate: row.end_date,
    reason: row.reason ?? undefined,
    status: row.status as LeaveRequestStatus,
    approvedBy: row.approved_by,
    approvedAt: row.approved_at,
    rejectedBy: row.rejected_by,
    rejectedAt: row.rejected_at,
    rejectionReason: row.rejection_reason,
    cancelledBy: row.cancelled_by,
    cancelledAt: row.cancelled_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface ILeaveRequestRepository {
  findById(id: string): Promise<LeaveRequest | null>;
  findByEmployeeId(employeeId: string): Promise<LeaveRequest[]>;
  findByStatus(status: LeaveRequestStatus): Promise<LeaveRequest[]>;
  findByEmployeeAndDateRange(
    employeeId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<LeaveRequest[]>;
  create(
    request: Omit<LeaveRequest, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<LeaveRequest>;
  update(
    id: string,
    data: Partial<LeaveRequest>,
  ): Promise<LeaveRequest | null>;
}

export class PgLeaveRequestRepository implements ILeaveRequestRepository {
  async findById(id: string): Promise<LeaveRequest | null> {
    const result = await pool.query<LeaveRequestRow>(
      'SELECT * FROM leave_requests WHERE id = $1',
      [id],
    );
    if (result.rows.length === 0) {
      return null;
    }
    return rowToLeaveRequest(result.rows[0]);
  }

  async findByEmployeeId(employeeId: string): Promise<LeaveRequest[]> {
    const result = await pool.query<LeaveRequestRow>(
      'SELECT * FROM leave_requests WHERE employee_id = $1',
      [employeeId],
    );
    return result.rows.map(rowToLeaveRequest);
  }

  async findByStatus(status: LeaveRequestStatus): Promise<LeaveRequest[]> {
    const result = await pool.query<LeaveRequestRow>(
      'SELECT * FROM leave_requests WHERE status = $1',
      [status],
    );
    return result.rows.map(rowToLeaveRequest);
  }

  async findByEmployeeAndDateRange(
    employeeId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<LeaveRequest[]> {
    const result = await pool.query<LeaveRequestRow>(
      `SELECT * FROM leave_requests
       WHERE employee_id = $1
         AND start_date <= $3
         AND end_date >= $2`,
      [employeeId, startDate, endDate],
    );
    return result.rows.map(rowToLeaveRequest);
  }

  async create(
    request: Omit<LeaveRequest, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<LeaveRequest> {
    const id = randomUUID();
    const now = new Date();
    const result = await pool.query<LeaveRequestRow>(
      `INSERT INTO leave_requests (
        id, employee_id, leave_policy_id, start_date, end_date,
        reason, status, approved_by, approved_at, rejected_by,
        rejected_at, rejection_reason, cancelled_by, cancelled_at,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *`,
      [
        id,
        request.employeeId,
        request.leavePolicyId,
        request.startDate,
        request.endDate,
        request.reason ?? null,
        request.status,
        request.approvedBy,
        request.approvedAt,
        request.rejectedBy,
        request.rejectedAt,
        request.rejectionReason,
        request.cancelledBy,
        request.cancelledAt,
        now,
        now,
      ],
    );
    return rowToLeaveRequest(result.rows[0]);
  }

  async update(
    id: string,
    data: Partial<LeaveRequest>,
  ): Promise<LeaveRequest | null> {
    const existing = await this.findById(id);
    if (!existing) {
      return null;
    }

    const merged = { ...existing, ...data, id, updatedAt: new Date() };

    const result = await pool.query<LeaveRequestRow>(
      `UPDATE leave_requests SET
        employee_id = $1,
        leave_policy_id = $2,
        start_date = $3,
        end_date = $4,
        reason = $5,
        status = $6,
        approved_by = $7,
        approved_at = $8,
        rejected_by = $9,
        rejected_at = $10,
        rejection_reason = $11,
        cancelled_by = $12,
        cancelled_at = $13,
        updated_at = $14
      WHERE id = $15
      RETURNING *`,
      [
        merged.employeeId,
        merged.leavePolicyId,
        merged.startDate,
        merged.endDate,
        merged.reason ?? null,
        merged.status,
        merged.approvedBy,
        merged.approvedAt,
        merged.rejectedBy,
        merged.rejectedAt,
        merged.rejectionReason,
        merged.cancelledBy,
        merged.cancelledAt,
        merged.updatedAt,
        id,
      ],
    );

    if (result.rows.length === 0) {
      return null;
    }
    return rowToLeaveRequest(result.rows[0]);
  }
}
