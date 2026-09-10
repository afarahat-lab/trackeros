import { randomUUID } from 'crypto';
import { Pool, PoolClient, QueryResult } from 'pg';
import { pool as defaultPool } from '../../shared/db/connection';
import { NotFoundError } from '../../shared/errors';
import { LeaveTypeCode } from '../../shared/types';
import { LeaveBalance, CreateLeaveBalanceInput } from './balance.model';

export interface IBalanceRepository {
  create(input: CreateLeaveBalanceInput, client?: PoolClient): Promise<LeaveBalance>;
  /**
   * `forUpdate` takes a row-level lock (SELECT ... FOR UPDATE). Pass it whenever the
   * caller intends to WRITE the row it just read: the balance deltas are computed in
   * application code, so without the lock two concurrent transactions both read the
   * same pendingDays and the second write silently discards the first (PostgreSQL's
   * default READ COMMITTED permits this — being inside a transaction is NOT enough).
   * Only meaningful with an explicit `client`; a lock outside a transaction is
   * released immediately and buys nothing.
   */
  findById(id: string, client?: PoolClient, forUpdate?: boolean): Promise<LeaveBalance | null>;
  findByKey(
    employeeId: string,
    leaveTypeCode: LeaveTypeCode,
    periodStart: Date,
    periodEnd: Date,
    client?: PoolClient,
    forUpdate?: boolean
  ): Promise<LeaveBalance | null>;
  update(
    id: string,
    changes: Partial<Omit<LeaveBalance, 'id'>>,
    client?: PoolClient
  ): Promise<LeaveBalance>;
}

interface LeaveBalanceRow {
  id: string;
  employee_id: string;
  leave_type_code: string;
  period_start: Date;
  period_end: Date;
  entitled_days: number;
  used_days: number;
  pending_days: number;
}

type BalanceField = Exclude<keyof LeaveBalance, 'id'>;

const FIELD_COLUMNS: Record<BalanceField, string> = {
  employeeId: 'employee_id',
  leaveTypeCode: 'leave_type_code',
  periodStart: 'period_start',
  periodEnd: 'period_end',
  entitledDays: 'entitled_days',
  usedDays: 'used_days',
  pendingDays: 'pending_days',
};

const COLUMNS =
  'id, employee_id, leave_type_code, period_start, period_end, entitled_days, used_days, pending_days';

function mapRow(row: LeaveBalanceRow): LeaveBalance {
  return {
    id: row.id,
    employeeId: row.employee_id,
    leaveTypeCode: row.leave_type_code as LeaveTypeCode,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    entitledDays: row.entitled_days,
    usedDays: row.used_days,
    pendingDays: row.pending_days,
  };
}

/**
 * ` FOR UPDATE` when the caller both asked for the lock AND is inside an explicit
 * transaction. Outside one, PostgreSQL commits the implicit single-statement
 * transaction straight away and the lock is gone before the caller can use it — so
 * emitting it there would imply a guarantee that does not exist.
 */
function lockClause(client: PoolClient | undefined, forUpdate: boolean): string {
  return client && forUpdate ? ' FOR UPDATE' : '';
}

export class PgLeaveBalanceRepository implements IBalanceRepository {
  constructor(private readonly dbPool: Pool = defaultPool) {}

  private db(client?: PoolClient): Pool | PoolClient {
    return client ?? this.dbPool;
  }

  async create(input: CreateLeaveBalanceInput, client?: PoolClient): Promise<LeaveBalance> {
    const id = randomUUID();
    const query = `
      INSERT INTO leave_balances (
        id, employee_id, leave_type_code, period_start, period_end,
        entitled_days, used_days, pending_days
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING ${COLUMNS}
    `;
    const values = [
      id,
      input.employeeId,
      input.leaveTypeCode,
      input.periodStart,
      input.periodEnd,
      input.entitledDays,
      input.usedDays,
      input.pendingDays,
    ];
    const result: QueryResult<LeaveBalanceRow> = await this.db(client).query(query, values);
    return mapRow(result.rows[0]);
  }

  async findById(
    id: string,
    client?: PoolClient,
    forUpdate = false
  ): Promise<LeaveBalance | null> {
    const query = `SELECT ${COLUMNS} FROM leave_balances WHERE id = $1${lockClause(client, forUpdate)}`;
    const result: QueryResult<LeaveBalanceRow> = await this.db(client).query(query, [id]);
    return result.rows.length ? mapRow(result.rows[0]) : null;
  }

  async findByKey(
    employeeId: string,
    leaveTypeCode: LeaveTypeCode,
    periodStart: Date,
    periodEnd: Date,
    client?: PoolClient,
    forUpdate = false
  ): Promise<LeaveBalance | null> {
    const query = `
      SELECT ${COLUMNS} FROM leave_balances
      WHERE employee_id = $1 AND leave_type_code = $2 AND period_start = $3 AND period_end = $4
      ${lockClause(client, forUpdate)}
    `;
    const result: QueryResult<LeaveBalanceRow> = await this.db(client).query(query, [
      employeeId,
      leaveTypeCode,
      periodStart,
      periodEnd,
    ]);
    return result.rows.length ? mapRow(result.rows[0]) : null;
  }

  async update(
    id: string,
    changes: Partial<Omit<LeaveBalance, 'id'>>,
    client?: PoolClient
  ): Promise<LeaveBalance> {
    const fields = Object.keys(changes) as BalanceField[];
    if (fields.length === 0) {
      const existing = await this.findById(id, client);
      if (!existing) {
        throw new NotFoundError('Leave balance not found');
      }
      return existing;
    }

    const setClauses = fields
      .map((field, index) => `${FIELD_COLUMNS[field]} = $${index + 2}`)
      .join(', ');
    const values = fields.map((field) => changes[field]);
    const query = `UPDATE leave_balances SET ${setClauses} WHERE id = $1 RETURNING ${COLUMNS}`;
    const result: QueryResult<LeaveBalanceRow> = await this.db(client).query(query, [
      id,
      ...values,
    ]);
    if (result.rows.length === 0) {
      throw new NotFoundError('Leave balance not found');
    }
    return mapRow(result.rows[0]);
  }
}
