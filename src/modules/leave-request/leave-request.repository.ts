
import { randomUUID } from 'crypto';
import { BaseRepository } from '../../shared/base-repository';
import { LeaveRequest } from './leave-request.model';
import {
  ILeaveRequestRepository,
  LeaveRequestFilters,
  LeaveRequestStatusMetadata,
} from './leave-request.repository.interface';
import { LeaveRequestStatus } from '../../shared/types';

interface LeaveRequestRow {
  [key: string]: unknown;
  id: string;
  employee_id: string;
  leave_type_id: string;
  leave_policy_id: string;
  start_date: Date;
  end_date: Date;
  days_count: number;
  reason: string | null;
  status: string;
  approved_by: string | null;
  approved_at: Date | null;
  cancelled_by: string | null;
  cancelled_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

const VALID_STATUSES: string[] = [
  LeaveRequestStatus.DRAFT,
  LeaveRequestStatus.SUBMITTED,
  LeaveRequestStatus.APPROVED,
  LeaveRequestStatus.REJECTED,
  LeaveRequestStatus.CANCELLED,
];

function rowToLeaveRequest(row: LeaveRequestRow): LeaveRequest {
  return {
    id: row.id,
    employeeId: row.employee_id,
    leaveTypeId: row.leave_type_id,
    leavePolicyId: row.leave_policy_id,
    startDate: row.start_date,
    endDate: row.end_date,
    daysCount: row.days_count,
    reason: row.reason ?? undefined,
    status: row.status as LeaveRequestStatus,
    approvedBy: row.approved_by,
    approvedAt: row.approved_at,
    cancelledBy: row.cancelled_by,
    cancelledAt: row.cancelled_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function isLeaveRequestRow(row: unknown): row is LeaveRequestRow {
  if (typeof row !== 'object' || row === null) return false;
  const r = row as Record<string, unknown>;
  return (
    typeof r.id === 'string' &&
    typeof r.employee_id === 'string' &&
    typeof r.leave_type_id === 'string' &&
    typeof r.leave_policy_id === 'string' &&
    r.start_date instanceof Date &&
    r.end_date instanceof Date &&
    typeof r.days_count === 'number' &&
    (r.reason === null || typeof r.reason === 'string') &&
    typeof r.status === 'string' &&
    VALID_STATUSES.includes(r.status) &&
    (r.approved_by === null || typeof r.approved_by === 'string') &&
    (r.approved_at === null || r.approved_at instanceof Date) &&
    (r.cancelled_by === null || typeof r.cancelled_by === 'string') &&
    (r.cancelled_at === null || r.cancelled_at instanceof Date) &&
    r.created_at instanceof Date &&
    r.updated_at instanceof Date
  );
}

class LeaveRequestBaseRepository extends BaseRepository {}

export class PgLeaveRequestRepository implements ILeaveRequestRepository {
  private readonly base = new LeaveRequestBaseRepository();
  private readonly table = 'leave_requests';

  async findById(id: string): Promise<LeaveRequest | null> {
    const result = await this.base.query<LeaveRequestRow>(
      `SELECT * FROM ${this.table} WHERE id = $1`,
      [id]
    );
    const row = result.rows[0];
    if (!row || !isLeaveRequestRow(row)) return null;
    return rowToLeaveRequest(row);
  }

  async findByEmployeeId(employeeId: string): Promise<LeaveRequest[]> {
    const result = await this.base.query<LeaveRequestRow>(
      `SELECT * FROM ${this.table} WHERE employee_id = $1`,
      [employeeId]
    );
    return result.rows.filter(isLeaveRequestRow).map(rowToLeaveRequest);
  }

  async findByEmployeeAndStatus(
    employeeId: string,
    status: LeaveRequestStatus
  ): Promise<LeaveRequest[]> {
    const result = await this.base.query<LeaveRequestRow>(
      `SELECT * FROM ${this.table} WHERE employee_id = $1 AND status = $2`,
      [employeeId, status]
    );
    return result.rows.filter(isLeaveRequestRow).map(rowToLeaveRequest);
  }

  async findOverlapping(
    employeeId: string,
    startDate: Date,
    endDate: Date
  ): Promise<LeaveRequest[]> {
    const result = await this.base.query<LeaveRequestRow>(
      `SELECT * FROM ${this.table}
       WHERE employee_id = $1
         AND start_date <= $3
         AND end_date >= $2`,
      [employeeId, startDate, endDate]
    );
    return result.rows.filter(isLeaveRequestRow).map(rowToLeaveRequest);
  }

  async findPendingByManagerId(managerId: string): Promise<LeaveRequest[]> {
    const result = await this.base.query<LeaveRequestRow>(
      `SELECT lr.* FROM ${this.table} lr
       INNER JOIN employees e ON lr.employee_id = e.id
       WHERE e.manager_id = $1 AND lr.status = $2`,
      [managerId, LeaveRequestStatus.SUBMITTED]
    );
    return result.rows.filter(isLeaveRequestRow).map(rowToLeaveRequest);
  }

  async findAll(filters: LeaveRequestFilters): Promise<LeaveRequest[]> {
    const clauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (filters.employeeId !== undefined) {
      clauses.push(`employee_id = $${paramIndex++}`);
      values.push(filters.employeeId);
    }
    if (filters.status !== undefined) {
      clauses.push(`status = $${paramIndex++}`);
      values.push(filters.status);
    }
    if (filters.leaveTypeId !== undefined) {
      clauses.push(`leave_type_id = $${paramIndex++}`);
      values.push(filters.leaveTypeId);
    }
    if (filters.startDateFrom !== undefined) {
      clauses.push(`start_date >= $${paramIndex++}`);
      values.push(filters.startDateFrom);
    }
    if (filters.startDateTo !== undefined) {
      clauses.push(`start_date <= $${paramIndex++}`);
      values.push(filters.startDateTo);
    }

    const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    const result = await this.base.query<LeaveRequestRow>(
      `SELECT * FROM ${this.table} ${whereClause}`,
      values
    );
    return result.rows.filter(isLeaveRequestRow).map(rowToLeaveRequest);
  }

  async create(
    request: Omit<LeaveRequest, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<LeaveRequest> {
    const id = randomUUID();
    const now = new Date();
    const data: Record<string, unknown> = {
      id,
      employee_id: request.employeeId,
      leave_type_id: request.leaveTypeId,
      leave_policy_id: request.leavePolicyId,
      start_date: request.startDate,
      end_date: request.endDate,
      days_count: request.daysCount,
      reason: request.reason ?? null,
      status: request.status,
      approved_by: request.approvedBy ?? null,
      approved_at: request.approvedAt ?? null,
      cancelled_by: request.cancelledBy ?? null,
      cancelled_at: request.cancelledAt ?? null,
      created_at: now,
      updated_at: now,
    };
    const result = await this.base.query<LeaveRequestRow>(
      `INSERT INTO ${this.table} (id, employee_id, leave_type_id, leave_policy_id, start_date, end_date, days_count, reason, status, approved_by, approved_at, cancelled_by, cancelled_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING *`,
      [
        data.id,
        data.employee_id,
        data.leave_type_id,
        data.leave_policy_id,
        data.start_date,
        data.end_date,
        data.days_count,
        data.reason,
        data.status,
        data.approved_by,
        data.approved_at,
        data.cancelled_by,
        data.cancelled_at,
        data.created_at,
        data.updated_at,
      ]
    );
    const row = result.rows[0];
    if (!row || !isLeaveRequestRow(row)) {
      throw new Error('Failed to create leave request');
    }
    return rowToLeaveRequest(row);
  }

  async update(
    id: string,
    request: Partial<Omit<LeaveRequest, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<LeaveRequest | null> {
    const now = new Date();
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (request.employeeId !== undefined) {
      setClauses.push(`employee_id = $${paramIndex++}`);
      values.push(request.employeeId);
    }
    if (request.leaveTypeId !== undefined) {
      setClauses.push(`leave_type_id = $${paramIndex++}`);
      values.push(request.leaveTypeId);
    }
    if (request.leavePolicyId !== undefined) {
      setClauses.push(`leave_policy_id = $${paramIndex++}`);
      values.push(request.leavePolicyId);
    }
    if (request.startDate !== undefined) {
      setClauses.push(`start_date = $${paramIndex++}`);
      values.push(request.startDate);
    }
    if (request.endDate !== undefined) {
      setClauses.push(`end_date = $${paramIndex++}`);
      values.push(request.endDate);
    }
    if (request.daysCount !== undefined) {
      setClauses.push(`days_count = $${paramIndex++}`);
      values.push(request.daysCount);
    }
    if (request.reason !== undefined) {
      setClauses.push(`reason = $${paramIndex++}`);
      values.push(request.reason ?? null);
    }
    if (request.status !== undefined) {
      setClauses.push(`status = $${paramIndex++}`);
      values.push(request.status);
    }
    if (request.approvedBy !== undefined) {
      setClauses.push(`approved_by = $${paramIndex++}`);
      values.push(request.approvedBy);
    }
    if (request.approvedAt !== undefined) {
      setClauses.push(`approved_at = $${paramIndex++}`);
      values.push(request.approvedAt);
    }
    if (request.cancelledBy !== undefined) {
      setClauses.push(`cancelled_by = $${paramIndex++}`);
      values.push(request.cancelledBy);
    }
    if (request.cancelledAt !== undefined) {
      setClauses.push(`cancelled_at = $${paramIndex++}`);
      values.push(request.cancelledAt);
    }

    if (setClauses.length === 0) {
      return this.findById(id);
    }

    setClauses.push(`updated_at = $${paramIndex++}`);
    values.push(now);
    values.push(id);

    const result = await this.base.query<LeaveRequestRow>(
      `UPDATE ${this.table} SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    const row = result.rows[0];
    if (!row || !isLeaveRequestRow(row)) return null;
    return rowToLeaveRequest(row);
  }

  async updateStatus(
    id: string,
    status: LeaveRequestStatus,
    metadata: LeaveRequestStatusMetadata
  ): Promise<LeaveRequest | null> {
    const now = new Date();
    const setClauses: string[] = ['status = $1', 'updated_at = $2'];
    const values: unknown[] = [status, now];
    let paramIndex = 3;

    if (metadata.approvedBy !== undefined) {
      setClauses.push(`approved_by = $${paramIndex++}`);
      values.push(metadata.approvedBy);
    }
    if (metadata.approvedAt !== undefined) {
      setClauses.push(`approved_at = $${paramIndex++}`);
      values.push(metadata.approvedAt);
    }
    if (metadata.cancelledBy !== undefined) {
      setClauses.push(`cancelled_by = $${paramIndex++}`);
      values.push(metadata.cancelledBy);
    }
    if (metadata.cancelledAt !== undefined) {
      setClauses.push(`cancelled_at = $${paramIndex++}`);
      values.push(metadata.cancelledAt);
    }

    values.push(id);

    const result = await this.base.query<LeaveRequestRow>(
      `UPDATE ${this.table} SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    const row = result.rows[0];
    if (!row || !isLeaveRequestRow(row)) return null;
    return rowToLeaveRequest(row);
  }
}
