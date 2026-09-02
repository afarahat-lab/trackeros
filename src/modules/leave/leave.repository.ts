import { randomUUID } from 'crypto';
import type { Pool, PoolClient } from 'pg';

import { pool } from '../../shared/db';
import { LeaveStatus, LeaveType } from '../../shared/types';
import type { CreateLeaveRequestDto } from '../../shared/types';
import { LeaveNotFoundError } from './leave.errors';
import type { LeaveRequest, UpdateLeaveRequestInput } from './leave.model';

const LEAVE_REQUEST_COLUMNS =
  'id, employee_id, leave_type, start_date, end_date, reason, status, approved_by, approved_at, created_at, updated_at';

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

export interface ILeaveRequestRepository {
  create(input: CreateLeaveRequestDto, client?: PoolClient): Promise<LeaveRequest>;
  findById(id: string): Promise<LeaveRequest | null>;
  findByEmployee(employeeId: string): Promise<LeaveRequest[]>;
  findByStatus(status: LeaveStatus): Promise<LeaveRequest[]>;
  update(id: string, changes: UpdateLeaveRequestInput, client?: PoolClient): Promise<LeaveRequest>;
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

export class LeaveRequestRepository implements ILeaveRequestRepository {
  async create(input: CreateLeaveRequestDto, client?: PoolClient): Promise<LeaveRequest> {
    const conn: Pool | PoolClient = client ?? pool;
    const now = new Date();

    const result = await conn.query<LeaveRequestRow>(
      `INSERT INTO leave_requests
         (id, employee_id, leave_type, start_date, end_date, reason, status, approved_by, approved_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING ${LEAVE_REQUEST_COLUMNS}`,
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
  }

  async findById(id: string): Promise<LeaveRequest | null> {
    const result = await pool.query<LeaveRequestRow>(
      `SELECT ${LEAVE_REQUEST_COLUMNS} FROM leave_requests WHERE id = $1`,
      [id]
    );

    return result.rows[0] ? mapRow(result.rows[0]) : null;
  }

  async findByEmployee(employeeId: string): Promise<LeaveRequest[]> {
    const result = await pool.query<LeaveRequestRow>(
      `SELECT ${LEAVE_REQUEST_COLUMNS}
       FROM leave_requests
       WHERE employee_id = $1
       ORDER BY start_date DESC, id ASC`,
      [employeeId]
    );

    return result.rows.map(mapRow);
  }

  async findByStatus(status: LeaveStatus): Promise<LeaveRequest[]> {
    const result = await pool.query<LeaveRequestRow>(
      `SELECT ${LEAVE_REQUEST_COLUMNS}
       FROM leave_requests
       WHERE status = $1
       ORDER BY start_date DESC, id ASC`,
      [status]
    );

    return result.rows.map(mapRow);
  }

  async update(
    id: string,
    changes: UpdateLeaveRequestInput,
    client?: PoolClient
  ): Promise<LeaveRequest> {
    const conn: Pool | PoolClient = client ?? pool;
    const now = new Date();

    const assignments: string[] = ['updated_at = $2'];
    const values: unknown[] = [id, now];
    let paramIndex = 2;

    const fields: ReadonlyArray<readonly [string, unknown]> = [
      ['status', changes.status],
      ['approved_by', changes.approvedBy],
      ['approved_at', changes.approvedAt],
    ];

    for (const [column, value] of fields) {
      if (value !== undefined) {
        paramIndex += 1;
        assignments.push(`${column} = $${paramIndex}`);
        values.push(value);
      }
    }

    const result = await conn.query<LeaveRequestRow>(
      `UPDATE leave_requests SET ${assignments.join(', ')} WHERE id = $1 RETURNING ${LEAVE_REQUEST_COLUMNS}`,
      values
    );

    const row = result.rows[0];
    if (!row) {
      throw new LeaveNotFoundError(id);
    }

    return mapRow(row);
  }
}
