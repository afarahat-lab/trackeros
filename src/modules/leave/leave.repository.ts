import { randomUUID } from 'crypto';
import type { Pool, PoolClient } from 'pg';

import { pool } from '../../shared/db';
import { LeaveStatus } from '../../shared/types';
import type {
  LeaveType,
  CreateLeaveRequestDto,
  UpdateLeaveRequestDto,
  LeaveRequestQueryParams,
} from '../../shared/types';
import { RepositoryError, UniqueConstraintError } from '../employee';
import type { LeaveRequest } from './leave.model';

const LEAVE_COLUMNS =
  'id, employee_id, leave_type, start_date, end_date, reason, status, approved_by, approved_at, created_at, updated_at';

const UNIQUE_CONSTRAINT_CODE = '23505';

interface LeaveRequestRow {
  id: string;
  employee_id: string;
  leave_type: string;
  start_date: Date;
  end_date: Date;
  reason: string | null;
  status: string;
  approved_by: string | null;
  approved_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export class LeaveNotFoundError extends RepositoryError {
  constructor(id: string) {
    super('LEAVE_NOT_FOUND', `Leave request with id '${id}' not found`);
    this.name = 'LeaveNotFoundError';
  }
}

export interface ILeaveRequestRepository {
  create(input: CreateLeaveRequestDto, client?: PoolClient): Promise<LeaveRequest>;
  findById(id: string): Promise<LeaveRequest | null>;
  findByEmployee(employeeId: string): Promise<LeaveRequest[]>;
  findByStatus(status: LeaveStatus): Promise<LeaveRequest[]>;
  findByQuery(query: LeaveRequestQueryParams): Promise<LeaveRequest[]>;
  update(id: string, changes: UpdateLeaveRequestDto, client?: PoolClient): Promise<LeaveRequest>;
  updateStatus(
    id: string,
    status: LeaveStatus,
    approvedBy?: string | null,
    client?: PoolClient
  ): Promise<LeaveRequest>;
  delete(id: string, client?: PoolClient): Promise<void>;
}

function mapRow(row: LeaveRequestRow): LeaveRequest {
  return {
    id: row.id,
    employeeId: row.employee_id,
    leaveType: row.leave_type as LeaveType,
    startDate: row.start_date,
    endDate: row.end_date,
    reason: row.reason ?? undefined,
    status: row.status as LeaveStatus,
    approvedBy: row.approved_by,
    approvedAt: row.approved_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

interface PgError {
  code: string;
}

function isPgError(err: unknown): err is PgError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    typeof (err as { code?: unknown }).code === 'string'
  );
}

function isPgUniqueViolation(err: unknown): err is PgError {
  return isPgError(err) && err.code === UNIQUE_CONSTRAINT_CODE;
}

export class LeaveRequestRepository implements ILeaveRequestRepository {
  async create(input: CreateLeaveRequestDto, client?: PoolClient): Promise<LeaveRequest> {
    const conn: Pool | PoolClient = client ?? pool;
    const now = new Date();

    try {
      const result = await conn.query<LeaveRequestRow>(
        `INSERT INTO leave_requests
           (id, employee_id, leave_type, start_date, end_date, reason, status, approved_by, approved_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING ${LEAVE_COLUMNS}`,
        [
          randomUUID(),
          input.employeeId,
          input.leaveType,
          input.startDate,
          input.endDate,
          input.reason ?? null,
          LeaveStatus.PENDING,
          null,
          null,
          now,
          now,
        ]
      );

      return mapRow(result.rows[0]);
    } catch (err) {
      if (isPgUniqueViolation(err)) {
        throw new UniqueConstraintError(
          'DUPLICATE_LEAVE_REQUEST',
          'A leave request with these values already exists'
        );
      }
      throw err;
    }
  }

  async findById(id: string): Promise<LeaveRequest | null> {
    const result = await pool.query<LeaveRequestRow>(
      `SELECT ${LEAVE_COLUMNS} FROM leave_requests WHERE id = $1`,
      [id]
    );

    return result.rows[0] ? mapRow(result.rows[0]) : null;
  }

  async findByEmployee(employeeId: string): Promise<LeaveRequest[]> {
    const result = await pool.query<LeaveRequestRow>(
      `SELECT ${LEAVE_COLUMNS} FROM leave_requests WHERE employee_id = $1 ORDER BY start_date DESC`,
      [employeeId]
    );

    return result.rows.map(mapRow);
  }

  async findByStatus(status: LeaveStatus): Promise<LeaveRequest[]> {
    const result = await pool.query<LeaveRequestRow>(
      `SELECT ${LEAVE_COLUMNS} FROM leave_requests WHERE status = $1 ORDER BY created_at DESC`,
      [status]
    );

    return result.rows.map(mapRow);
  }

  async findByQuery(query: LeaveRequestQueryParams): Promise<LeaveRequest[]> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    const pushParam = (value: unknown): number => {
      values.push(value);
      const index = paramIndex;
      paramIndex += 1;
      return index;
    };

    if (query.status !== undefined) {
      const index = pushParam(query.status);
      conditions.push(`status = $${index}`);
    }
    if (query.leaveType !== undefined) {
      const index = pushParam(query.leaveType);
      conditions.push(`leave_type = $${index}`);
    }
    if (query.startDateFrom !== undefined) {
      const index = pushParam(query.startDateFrom);
      conditions.push(`start_date >= $${index}`);
    }
    if (query.startDateTo !== undefined) {
      const index = pushParam(query.startDateTo);
      conditions.push(`start_date <= $${index}`);
    }
    if (query.endDateFrom !== undefined) {
      const index = pushParam(query.endDateFrom);
      conditions.push(`end_date >= $${index}`);
    }
    if (query.endDateTo !== undefined) {
      const index = pushParam(query.endDateTo);
      conditions.push(`end_date <= $${index}`);
    }

    let sql = `SELECT ${LEAVE_COLUMNS} FROM leave_requests`;
    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }
    sql += ' ORDER BY created_at DESC';

    if (query.limit !== undefined) {
      const index = pushParam(query.limit);
      sql += ` LIMIT $${index}`;
    }
    if (query.offset !== undefined) {
      const index = pushParam(query.offset);
      sql += ` OFFSET $${index}`;
    }

    const result = await pool.query<LeaveRequestRow>(sql, values);

    return result.rows.map(mapRow);
  }

  async update(
    id: string,
    changes: UpdateLeaveRequestDto,
    client?: PoolClient
  ): Promise<LeaveRequest> {
    const conn: Pool | PoolClient = client ?? pool;
    const now = new Date();

    const assignments: string[] = ['updated_at = $2'];
    const values: unknown[] = [id, now];
    let paramIndex = 2;

    const fields: ReadonlyArray<readonly [string, unknown]> = [
      ['start_date', changes.startDate],
      ['end_date', changes.endDate],
      ['reason', changes.reason],
    ];

    for (const [column, value] of fields) {
      if (value !== undefined) {
        paramIndex += 1;
        assignments.push(`${column} = $${paramIndex}`);
        values.push(value);
      }
    }

    try {
      const result = await conn.query<LeaveRequestRow>(
        `UPDATE leave_requests SET ${assignments.join(', ')} WHERE id = $1 RETURNING ${LEAVE_COLUMNS}`,
        values
      );

      const row = result.rows[0];
      if (!row) {
        throw new LeaveNotFoundError(id);
      }

      return mapRow(row);
    } catch (err) {
      if (isPgUniqueViolation(err)) {
        throw new UniqueConstraintError(
          'DUPLICATE_LEAVE_REQUEST',
          'A leave request with these values already exists'
        );
      }
      throw err;
    }
  }

  async updateStatus(
    id: string,
    status: LeaveStatus,
    approvedBy?: string | null,
    client?: PoolClient
  ): Promise<LeaveRequest> {
    const conn: Pool | PoolClient = client ?? pool;
    const now = new Date();

    const isTerminal = status === LeaveStatus.APPROVED || status === LeaveStatus.REJECTED;
    const finalApprovedBy = isTerminal ? (approvedBy ?? null) : null;
    const finalApprovedAt = isTerminal ? now : null;

    const result = await conn.query<LeaveRequestRow>(
      `UPDATE leave_requests
         SET status = $2, approved_by = $3, approved_at = $4, updated_at = $5
       WHERE id = $1
       RETURNING ${LEAVE_COLUMNS}`,
      [id, status, finalApprovedBy, finalApprovedAt, now]
    );

    const row = result.rows[0];
    if (!row) {
      throw new LeaveNotFoundError(id);
    }

    return mapRow(row);
  }

  async delete(id: string, client?: PoolClient): Promise<void> {
    const conn: Pool | PoolClient = client ?? pool;

    const result = await conn.query(
      `DELETE FROM leave_requests WHERE id = $1`,
      [id]
    );

    if (result.rowCount === 0) {
      throw new LeaveNotFoundError(id);
    }
  }
}
