import { randomUUID } from 'crypto';
import { Pool, PoolClient, QueryResult } from 'pg';
import { pool as defaultPool } from '../../shared/db/connection';
import { NotFoundError } from '../../shared/errors';
import {
  LeaveRequestQueryParams,
  LeaveStatus,
  LeaveTypeCode,
  UpdateLeaveRequestDto,
} from '../../shared/types';
import { CreateLeaveRequestInput, LeaveRequest, PendingDecision } from './leave.model';

export interface ILeaveRepository {
  create(input: CreateLeaveRequestInput, client?: PoolClient): Promise<LeaveRequest>;
  findById(id: string, client?: PoolClient): Promise<LeaveRequest | null>;
  update(id: string, changes: UpdateLeaveRequestDto, client?: PoolClient): Promise<LeaveRequest>;
  findByQuery(params: LeaveRequestQueryParams, client?: PoolClient): Promise<LeaveRequest[]>;
  findByReversesRequestId(
    reversesRequestId: string,
    client?: PoolClient
  ): Promise<LeaveRequest | null>;
  /**
   * The decision queue: every SUBMITTED request, oldest start date first. Scoped to
   * `employeeIds` exactly as `findByQuery` scopes it, so an absent/empty list applies
   * no employee filter and the caller (an ADMIN) sees all of them.
   */
  findPendingDecisions(
    employeeIds?: string[],
    client?: PoolClient
  ): Promise<PendingDecision[]>;
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
  cancelled_by: string | null;
  cancelled_at: Date | null;
  reverses_request_id: string | null;
}

const COLUMNS =
  'id, employee_id, leave_type_code, start_date, end_date, requested_days, reason, ' +
  'status, approver_id, approval_comment, submitted_at, decided_at, cancelled_by, cancelled_at, ' +
  'reverses_request_id';

type UpdateField = keyof UpdateLeaveRequestDto;

const FIELD_COLUMNS: Record<UpdateField, string> = {
  startDate: 'start_date',
  endDate: 'end_date',
  reason: 'reason',
  status: 'status',
  approverId: 'approver_id',
  decidedAt: 'decided_at',
  cancelledBy: 'cancelled_by',
  cancelledAt: 'cancelled_at',
};

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
    cancelledBy: row.cancelled_by,
    cancelledAt: row.cancelled_at,
    reversesRequestId: row.reverses_request_id,
  };
}

/** Projects a full request down to the fields the pending-decision queue renders. */
function toPendingDecision(request: LeaveRequest): PendingDecision {
  return {
    requestId: request.id,
    employeeId: request.employeeId,
    leaveTypeCode: request.leaveTypeCode,
    startDate: request.startDate,
    endDate: request.endDate,
    requestedDays: request.requestedDays,
    status: request.status,
  };
}

export class PgLeaveRequestRepository implements ILeaveRepository {
  constructor(private readonly dbPool: Pool = defaultPool) {}

  private db(client?: PoolClient): Pool | PoolClient {
    return client ?? this.dbPool;
  }

  async create(input: CreateLeaveRequestInput, client?: PoolClient): Promise<LeaveRequest> {
    const id = randomUUID();
    const query = `
      INSERT INTO leave_requests (
        id, employee_id, leave_type_code, start_date, end_date, requested_days,
        reason, status, approver_id, approval_comment, submitted_at, decided_at,
        cancelled_by, cancelled_at, reverses_request_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
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
      input.status,
      input.approverId,
      input.approvalComment,
      input.submittedAt,
      input.decidedAt,
      input.cancelledBy,
      input.cancelledAt,
      input.reversesRequestId,
    ];
    const result: QueryResult<LeaveRequestRow> = await this.db(client).query(query, values);
    return mapRow(result.rows[0]);
  }

  async findById(id: string, client?: PoolClient): Promise<LeaveRequest | null> {
    const query = `SELECT ${COLUMNS} FROM leave_requests WHERE id = $1`;
    const result: QueryResult<LeaveRequestRow> = await this.db(client).query(query, [id]);
    return result.rows.length ? mapRow(result.rows[0]) : null;
  }

  async findByReversesRequestId(
    reversesRequestId: string,
    client?: PoolClient
  ): Promise<LeaveRequest | null> {
    const query = `SELECT ${COLUMNS} FROM leave_requests WHERE reverses_request_id = $1`;
    const result: QueryResult<LeaveRequestRow> = await this.db(client).query(query, [
      reversesRequestId,
    ]);
    return result.rows.length ? mapRow(result.rows[0]) : null;
  }

  async update(
    id: string,
    changes: UpdateLeaveRequestDto,
    client?: PoolClient
  ): Promise<LeaveRequest> {
    const fields = Object.keys(changes) as UpdateField[];
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

  async findByQuery(
    params: LeaveRequestQueryParams,
    client?: PoolClient
  ): Promise<LeaveRequest[]> {
    const conditions: string[] = [];
    const values: unknown[] = [];

    if (params.status !== undefined) {
      values.push(params.status);
      conditions.push(`status = $${values.length}`);
    }
    if (params.leaveTypeCode !== undefined) {
      values.push(params.leaveTypeCode);
      conditions.push(`leave_type_code = $${values.length}`);
    }
    if (params.startDateFrom !== undefined) {
      values.push(params.startDateFrom);
      conditions.push(`start_date >= $${values.length}`);
    }
    if (params.startDateTo !== undefined) {
      values.push(params.startDateTo);
      conditions.push(`start_date <= $${values.length}`);
    }
    if (params.endDateFrom !== undefined) {
      values.push(params.endDateFrom);
      conditions.push(`end_date >= $${values.length}`);
    }
    if (params.endDateTo !== undefined) {
      values.push(params.endDateTo);
      conditions.push(`end_date <= $${values.length}`);
    }
    if (params.employeeIds !== undefined && params.employeeIds.length > 0) {
      values.push(params.employeeIds);
      conditions.push(`employee_id = ANY($${values.length})`);
    }

    let query = `SELECT ${COLUMNS} FROM leave_requests`;
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    query += ' ORDER BY start_date DESC';

    if (params.limit !== undefined) {
      values.push(params.limit);
      query += ` LIMIT $${values.length}`;
    }
    if (params.offset !== undefined) {
      values.push(params.offset);
      query += ` OFFSET $${values.length}`;
    }

    const result: QueryResult<LeaveRequestRow> = await this.db(client).query(query, values);
    return result.rows.map(mapRow);
  }

  /**
   * SUBMITTED-only: the queue is requests awaiting a decision, not a decision
   * history, so a CANCELLED (or decided) request is excluded by this single
   * predicate alone — no second status filter, and no `reverses_request_id`
   * filter. Oldest start date first: the most urgent request leads.
   */
  async findPendingDecisions(
    employeeIds?: string[],
    client?: PoolClient
  ): Promise<PendingDecision[]> {
    const conditions: string[] = [`status = '${LeaveStatus.SUBMITTED}'`];
    const values: unknown[] = [];

    if (employeeIds !== undefined && employeeIds.length > 0) {
      values.push(employeeIds);
      conditions.push(`employee_id = ANY($${values.length})`);
    }

    const query =
      `SELECT ${COLUMNS} FROM leave_requests WHERE ${conditions.join(' AND ')}` +
      ' ORDER BY start_date ASC';

    const result: QueryResult<LeaveRequestRow> = await this.db(client).query(query, values);
    return result.rows.map((row) => toPendingDecision(mapRow(row)));
  }
}
