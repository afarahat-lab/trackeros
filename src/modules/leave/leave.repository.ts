import { randomUUID } from 'crypto';
import { Pool, PoolClient, QueryResult } from 'pg';
import { pool as defaultPool } from '../../shared/db/connection';
import { NotFoundError } from '../../shared/errors';
import { LeaveStatus, LeaveTypeCode, LeaveRequestQueryParams } from '../../shared/types';
import {
  LeaveRequest,
  CreateLeaveRequestInput,
  UpdateLeaveRequestInput,
} from './leave.model';

export interface ILeaveRepository {
  create(input: CreateLeaveRequestInput, client?: PoolClient): Promise<LeaveRequest>;
  findById(id: string, client?: PoolClient): Promise<LeaveRequest | null>;
  findByEmployeeId(employeeId: string, client?: PoolClient): Promise<LeaveRequest[]>;
  findAll(params: LeaveRequestQueryParams, client?: PoolClient): Promise<LeaveRequest[]>;
  update(
    id: string,
    changes: UpdateLeaveRequestInput,
    client?: PoolClient
  ): Promise<LeaveRequest>;
}

interface LeaveRequestRow {
  id: string;
  employee_id: string;
  leave_type_code: string;
  start_date: Date;
  end_date: Date;
  requested_days: number;
  reason: string | null;
  status: string;
  approver_id: string | null;
  approval_comment: string | null;
  submitted_at: Date | null;
  decided_at: Date | null;
}

function mapRow(row: LeaveRequestRow): LeaveRequest {
  return {
    id: row.id,
    employeeId: row.employee_id,
    leaveTypeCode: row.leave_type_code as LeaveTypeCode,
    startDate: row.start_date,
    endDate: row.end_date,
    requestedDays: row.requested_days,
    reason: row.reason,
    status: row.status as LeaveStatus,
    approverId: row.approver_id,
    approvalComment: row.approval_comment,
    submittedAt: row.submitted_at,
    decidedAt: row.decided_at,
  };
}

const COLUMNS =
  'id, employee_id, leave_type_code, start_date, end_date, requested_days, reason, ' +
  'status, approver_id, approval_comment, submitted_at, decided_at';

type LeaveField = keyof UpdateLeaveRequestInput;

const FIELD_COLUMNS: Record<LeaveField, string> = {
  startDate: 'start_date',
  endDate: 'end_date',
  reason: 'reason',
  status: 'status',
  approverId: 'approver_id',
  approvalComment: 'approval_comment',
  submittedAt: 'submitted_at',
  decidedAt: 'decided_at',
};

export class PgLeaveRequestRepository implements ILeaveRepository {
  constructor(private readonly dbPool: Pool = defaultPool) {}

  private db(client?: PoolClient): Pool | PoolClient {
    return client ?? this.dbPool;
  }

  async create(input: CreateLeaveRequestInput, client?: PoolClient): Promise<LeaveRequest> {
    const id = randomUUID();
    const query = `
      INSERT INTO leave_requests (
        id, employee_id, leave_type_code, start_date, end_date, requested_days, reason,
        status, approver_id, approval_comment, submitted_at, decided_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING ${COLUMNS}
    `;
    const values = [
      id,
      input.employeeId,
      input.leaveTypeCode,
      input.startDate,
      input.endDate,
      input.requestedDays,
      input.reason,
      LeaveStatus.DRAFT,
      null,
      null,
      null,
      null,
    ];
    const result: QueryResult<LeaveRequestRow> = await this.db(client).query(query, values);
    return mapRow(result.rows[0]);
  }

  async findById(id: string, client?: PoolClient): Promise<LeaveRequest | null> {
    const query = `SELECT ${COLUMNS} FROM leave_requests WHERE id = $1`;
    const result: QueryResult<LeaveRequestRow> = await this.db(client).query(query, [id]);
    return result.rows.length ? mapRow(result.rows[0]) : null;
  }

  async findByEmployeeId(employeeId: string, client?: PoolClient): Promise<LeaveRequest[]> {
    const query = `SELECT ${COLUMNS} FROM leave_requests WHERE employee_id = $1 ORDER BY start_date DESC`;
    const result: QueryResult<LeaveRequestRow> = await this.db(client).query(query, [
      employeeId,
    ]);
    return result.rows.map(mapRow);
  }

  async findAll(
    params: LeaveRequestQueryParams,
    client?: PoolClient
  ): Promise<LeaveRequest[]> {
    const conditions: string[] = [];
    const values: unknown[] = [];

    if (params.status) {
      values.push(params.status);
      conditions.push(`status = $${values.length}`);
    }
    if (params.leaveTypeCode) {
      values.push(params.leaveTypeCode);
      conditions.push(`leave_type_code = $${values.length}`);
    }
    if (params.startDateFrom) {
      values.push(params.startDateFrom);
      conditions.push(`start_date >= $${values.length}`);
    }
    if (params.startDateTo) {
      values.push(params.startDateTo);
      conditions.push(`start_date <= $${values.length}`);
    }
    if (params.endDateFrom) {
      values.push(params.endDateFrom);
      conditions.push(`end_date >= $${values.length}`);
    }
    if (params.endDateTo) {
      values.push(params.endDateTo);
      conditions.push(`end_date <= $${values.length}`);
    }

    let query = `SELECT ${COLUMNS} FROM leave_requests`;
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    query += ' ORDER BY start_date DESC';

    const limit = params.limit ?? 100;
    const offset = params.offset ?? 0;
    values.push(limit);
    query += ` LIMIT $${values.length}`;
    values.push(offset);
    query += ` OFFSET $${values.length}`;

    const result: QueryResult<LeaveRequestRow> = await this.db(client).query(query, values);
    return result.rows.map(mapRow);
  }

  async update(
    id: string,
    changes: UpdateLeaveRequestInput,
    client?: PoolClient
  ): Promise<LeaveRequest> {
    const fields = Object.keys(changes) as LeaveField[];
    if (fields.length === 0) {
      const existing = await this.findById(id, client);
      if (!existing) {
        throw new NotFoundError('Leave request not found');
      }
      return existing;
    }

    const setClauses = fields
      .map((field, index) => `${FIELD_COLUMNS[field]} = $${index + 2}`)
      .join(', ');
    const values = fields.map((field) => changes[field]);
    const query = `UPDATE leave_requests SET ${setClauses} WHERE id = $1 RETURNING ${COLUMNS}`;
    const result: QueryResult<LeaveRequestRow> = await this.db(client).query(query, [
      id,
      ...values,
    ]);
    if (result.rows.length === 0) {
      throw new NotFoundError('Leave request not found');
    }
    return mapRow(result.rows[0]);
  }
}
