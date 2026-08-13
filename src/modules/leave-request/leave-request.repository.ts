import { Pool } from 'pg';
import { pool } from '../../shared/db/connection';
import { LeaveStatus } from '../../shared/types';
import { LeaveRequest } from './leave-request.model';
import {
  ILeaveRequestRepository,
  CreateLeaveRequestDto,
  StatusUpdateMetadata,
} from './leave-request.repository.interface';

interface LeaveRequestRow {
  id: string;
  employee_id: string;
  leave_type_id: string;
  start_date: Date;
  end_date: Date;
  reason: string | null;
  status: LeaveStatus;
  approved_by: string | null;
  approved_at: Date | null;
  rejected_by: string | null;
  rejected_at: Date | null;
  rejection_reason: string | null;
  created_at: Date;
  updated_at: Date;
}

type Queryable = Pick<Pool, 'query'>;

function rowToLeaveRequest(row: LeaveRequestRow): LeaveRequest {
  return {
    id: row.id,
    employeeId: row.employee_id,
    leaveTypeId: row.leave_type_id,
    startDate: row.start_date,
    endDate: row.end_date,
    reason: row.reason ?? undefined,
    status: row.status,
    approvedBy: row.approved_by,
    approvedAt: row.approved_at,
    rejectedBy: row.rejected_by,
    rejectedAt: row.rejected_at,
    rejectionReason: row.rejection_reason ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

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
  'created_at',
  'updated_at',
].join(', ');

export class LeaveRequestRepository implements ILeaveRequestRepository {
  private readonly db: Queryable;

  constructor(client?: Queryable) {
    this.db = client ?? pool;
  }

  async findById(id: string): Promise<LeaveRequest | null> {
    const result = await this.db.query<LeaveRequestRow>(
      `SELECT ${COLUMNS} FROM leave_requests WHERE id = $1`,
      [id],
    );
    if (result.rows.length === 0) {
      return null;
    }
    return rowToLeaveRequest(result.rows[0]);
  }

  async findByEmployeeId(employeeId: string): Promise<LeaveRequest[]> {
    const result = await this.db.query<LeaveRequestRow>(
      `SELECT ${COLUMNS} FROM leave_requests WHERE employee_id = $1 ORDER BY start_date DESC`,
      [employeeId],
    );
    return result.rows.map(rowToLeaveRequest);
  }

  async findOverlapping(
    employeeId: string,
    startDate: Date,
    endDate: Date,
    excludeStatuses: LeaveStatus[],
  ): Promise<LeaveRequest[]> {
    let query = `SELECT ${COLUMNS} FROM leave_requests WHERE employee_id = $1 AND start_date <= $3 AND end_date >= $2`;
    const params: unknown[] = [employeeId, startDate, endDate];

    if (excludeStatuses.length > 0) {
      const placeholders = excludeStatuses.map((_, i) => `$${i + 4}`);
      query += ` AND status NOT IN (${placeholders.join(', ')})`;
      params.push(...excludeStatuses);
    }

    query += ' ORDER BY start_date ASC';

    const result = await this.db.query<LeaveRequestRow>(query, params);
    return result.rows.map(rowToLeaveRequest);
  }

  async create(dto: CreateLeaveRequestDto): Promise<LeaveRequest> {
    const result = await this.db.query<LeaveRequestRow>(
      `INSERT INTO leave_requests (employee_id, leave_type_id, start_date, end_date, reason, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING ${COLUMNS}`,
      [
        dto.employeeId,
        dto.leaveTypeId,
        dto.startDate,
        dto.endDate,
        dto.reason ?? null,
        dto.status ?? LeaveStatus.DRAFT,
      ],
    );
    return rowToLeaveRequest(result.rows[0]);
  }

  async updateStatus(
    id: string,
    status: LeaveStatus,
    metadata: StatusUpdateMetadata,
  ): Promise<LeaveRequest | null> {
    const setClauses: string[] = [`status = $1`];
    const values: unknown[] = [status];
    let paramIndex = 2;

    // Set approval metadata fields
    if (metadata.approvedBy !== undefined) {
      setClauses.push(`approved_by = $${paramIndex++}`);
      values.push(metadata.approvedBy);
    }
    if (metadata.approvedAt !== undefined) {
      setClauses.push(`approved_at = $${paramIndex++}`);
      values.push(metadata.approvedAt);
    }

    // Set rejection metadata fields
    if (metadata.rejectedBy !== undefined) {
      setClauses.push(`rejected_by = $${paramIndex++}`);
      values.push(metadata.rejectedBy);
    }
    if (metadata.rejectedAt !== undefined) {
      setClauses.push(`rejected_at = $${paramIndex++}`);
      values.push(metadata.rejectedAt);
    }
    if (metadata.rejectionReason !== undefined) {
      setClauses.push(`rejection_reason = $${paramIndex++}`);
      values.push(metadata.rejectionReason);
    }

    // Null out opposing metadata based on target status
    if (status === LeaveStatus.APPROVED) {
      setClauses.push(`rejected_by = NULL`);
      setClauses.push(`rejected_at = NULL`);
      setClauses.push(`rejection_reason = NULL`);
    } else if (status === LeaveStatus.REJECTED) {
      setClauses.push(`approved_by = NULL`);
      setClauses.push(`approved_at = NULL`);
    } else {
      // For DRAFT, SUBMITTED, CANCELLED — clear both approval and rejection metadata
      setClauses.push(`approved_by = NULL`);
      setClauses.push(`approved_at = NULL`);
      setClauses.push(`rejected_by = NULL`);
      setClauses.push(`rejected_at = NULL`);
      setClauses.push(`rejection_reason = NULL`);
    }

    setClauses.push(`updated_at = NOW()`);
    values.push(id);

    const result = await this.db.query<LeaveRequestRow>(
      `UPDATE leave_requests SET ${setClauses.join(', ')} WHERE id = $${paramIndex}
       RETURNING ${COLUMNS}`,
      values,
    );

    if (result.rows.length === 0) {
      return null;
    }
    return rowToLeaveRequest(result.rows[0]);
  }

  async findByStatus(status: LeaveStatus): Promise<LeaveRequest[]> {
    const result = await this.db.query<LeaveRequestRow>(
      `SELECT ${COLUMNS} FROM leave_requests WHERE status = $1 ORDER BY start_date ASC`,
      [status],
    );
    return result.rows.map(rowToLeaveRequest);
  }
}
