import type { PoolClient } from 'pg';

import { pool } from '../../shared/db/connection';
import { LeaveRequestStatus } from '../../shared/types';
import { ILeaveRequestRepository, LeaveRequest } from './leave.model';

const COLUMNS = [
  'id',
  'employee_id',
  'leave_type_id',
  'start_date',
  'end_date',
  'reason',
  'status',
  'approved_by',
  'approved_at',
  'rejected_by',
  'rejected_at',
  'rejection_reason',
  'cancelled_by',
  'cancelled_at',
  'created_at',
  'updated_at'
] as const;

const COLUMN_LIST = COLUMNS.join(', ');

interface LeaveRequestRow {
  id: string;
  employee_id: string;
  leave_type_id: string;
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

type LeaveRequestStatusValue =
  (typeof LeaveRequestStatus)[keyof typeof LeaveRequestStatus];

function isLeaveRequestStatus(value: string): value is LeaveRequestStatusValue {
  return Object.values(LeaveRequestStatus).includes(
    value as LeaveRequestStatusValue
  );
}

function mapRow(row: LeaveRequestRow): LeaveRequest {
  const status = isLeaveRequestStatus(row.status)
    ? row.status
    : LeaveRequestStatus.DRAFT;
  return {
    id: row.id,
    employeeId: row.employee_id,
    leaveTypeId: row.leave_type_id,
    startDate: row.start_date,
    endDate: row.end_date,
    reason: row.reason ?? undefined,
    status,
    approvedBy: row.approved_by,
    approvedAt: row.approved_at,
    rejectedBy: row.rejected_by,
    rejectedAt: row.rejected_at,
    rejectionReason: row.rejection_reason,
    cancelledBy: row.cancelled_by,
    cancelledAt: row.cancelled_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export class PgLeaveRequestRepository implements ILeaveRequestRepository {
  async create(
    request: LeaveRequest,
    client?: PoolClient
  ): Promise<LeaveRequest> {
    const db = client ?? pool;
    const result = await db.query(
      `INSERT INTO leave_requests (
         id, employee_id, leave_type_id, start_date, end_date, reason, status,
         approved_by, approved_at, rejected_by, rejected_at, rejection_reason,
         cancelled_by, cancelled_at, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       RETURNING ${COLUMN_LIST}`,
      [
        request.id,
        request.employeeId,
        request.leaveTypeId,
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
        request.createdAt,
        request.updatedAt
      ]
    );
    return mapRow(result.rows[0] as LeaveRequestRow);
  }

  async update(
    request: LeaveRequest,
    client?: PoolClient
  ): Promise<LeaveRequest> {
    const db = client ?? pool;
    const result = await db.query(
      `UPDATE leave_requests
       SET employee_id = $2, leave_type_id = $3, start_date = $4, end_date = $5,
           reason = $6, status = $7, approved_by = $8, approved_at = $9,
           rejected_by = $10, rejected_at = $11, rejection_reason = $12,
           cancelled_by = $13, cancelled_at = $14, updated_at = $15
       WHERE id = $1
       RETURNING ${COLUMN_LIST}`,
      [
        request.id,
        request.employeeId,
        request.leaveTypeId,
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
        request.updatedAt
      ]
    );
    return mapRow(result.rows[0] as LeaveRequestRow);
  }

  async findById(
    id: string,
    client?: PoolClient
  ): Promise<LeaveRequest | null> {
    const db = client ?? pool;
    const result = await db.query(
      `SELECT ${COLUMN_LIST} FROM leave_requests WHERE id = $1`,
      [id]
    );
    const row = result.rows[0] as LeaveRequestRow | undefined;
    return row ? mapRow(row) : null;
  }

  async findByEmployee(
    employeeId: string,
    client?: PoolClient
  ): Promise<LeaveRequest[]> {
    const db = client ?? pool;
    const result = await db.query(
      `SELECT ${COLUMN_LIST} FROM leave_requests
       WHERE employee_id = $1 ORDER BY start_date DESC`,
      [employeeId]
    );
    return (result.rows as LeaveRequestRow[]).map(mapRow);
  }

  async findApprovedOverlapping(
    employeeId: string,
    startDate: Date,
    endDate: Date,
    client?: PoolClient
  ): Promise<LeaveRequest[]> {
    const db = client ?? pool;
    const result = await db.query(
      `SELECT ${COLUMN_LIST} FROM leave_requests
       WHERE employee_id = $1
         AND status = $2
         AND start_date <= $4
         AND end_date >= $3`,
      [employeeId, LeaveRequestStatus.APPROVED, startDate, endDate]
    );
    return (result.rows as LeaveRequestRow[]).map(mapRow);
  }
}
