import { randomUUID } from 'crypto';
import type { Pool, PoolClient } from 'pg';

import { pool } from '../../shared/db';
import { UniqueConstraintError } from '../employee/index';
import { BalanceNotFoundError, InsufficientBalanceError } from './balance.errors';
import type {
  LeaveBalance,
  CreateLeaveBalanceInput,
  UpdateLeaveBalanceInput,
} from './balance.model';

const BALANCE_COLUMNS =
  'id, employee_id, policy_id, total_entitlement, used_days, remaining_days, fiscal_year, status, created_at, updated_at';

const UNIQUE_CONSTRAINT_CODE = '23505';

interface BalanceRow {
  id: string;
  employee_id: string;
  policy_id: string;
  total_entitlement: number;
  used_days: number;
  remaining_days: number;
  fiscal_year: number;
  status: string;
  created_at: Date;
  updated_at: Date;
}

export interface ILeaveBalanceRepository {
  create(input: CreateLeaveBalanceInput, client?: PoolClient): Promise<LeaveBalance>;
  findById(id: string): Promise<LeaveBalance | null>;
  findByEmployee(employeeId: string): Promise<LeaveBalance[]>;
  findByEmployeeAndPolicy(employeeId: string, policyId: string): Promise<LeaveBalance[]>;
  findByEmployeeAndFiscalYear(
    employeeId: string,
    policyId: string,
    fiscalYear: number
  ): Promise<LeaveBalance | null>;
  update(
    id: string,
    changes: UpdateLeaveBalanceInput,
    client?: PoolClient
  ): Promise<LeaveBalance>;
  commitDays(
    employeeId: string,
    policyId: string,
    fiscalYear: number,
    days: number,
    client?: PoolClient
  ): Promise<LeaveBalance>;
}

function mapRow(row: BalanceRow): LeaveBalance {
  return {
    id: row.id,
    employeeId: row.employee_id,
    policyId: row.policy_id,
    totalEntitlement: row.total_entitlement,
    usedDays: row.used_days,
    remainingDays: row.remaining_days,
    fiscalYear: row.fiscal_year,
    status: row.status,
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

export class LeaveBalanceRepository implements ILeaveBalanceRepository {
  async create(input: CreateLeaveBalanceInput, client?: PoolClient): Promise<LeaveBalance> {
    const conn: Pool | PoolClient = client ?? pool;
    const now = new Date();
    const usedDays = input.usedDays ?? 0;
    const remainingDays = input.totalEntitlement - usedDays;

    try {
      const result = await conn.query<BalanceRow>(
        `INSERT INTO leave_balances
           (id, employee_id, policy_id, total_entitlement, used_days, remaining_days, fiscal_year, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING ${BALANCE_COLUMNS}`,
        [
          randomUUID(),
          input.employeeId,
          input.policyId,
          input.totalEntitlement,
          usedDays,
          remainingDays,
          input.fiscalYear,
          input.status ?? 'ACTIVE',
          now,
          now,
        ]
      );

      return mapRow(result.rows[0]);
    } catch (err) {
      if (isPgUniqueViolation(err)) {
        throw new UniqueConstraintError(
          'DUPLICATE_BALANCE',
          'A leave balance already exists for this employee, policy and fiscal year'
        );
      }
      throw err;
    }
  }

  async findById(id: string): Promise<LeaveBalance | null> {
    const result = await pool.query<BalanceRow>(
      `SELECT ${BALANCE_COLUMNS} FROM leave_balances WHERE id = $1`,
      [id]
    );

    return result.rows[0] ? mapRow(result.rows[0]) : null;
  }

  async findByEmployee(employeeId: string): Promise<LeaveBalance[]> {
    const result = await pool.query<BalanceRow>(
      `SELECT ${BALANCE_COLUMNS} FROM leave_balances WHERE employee_id = $1 ORDER BY fiscal_year DESC`,
      [employeeId]
    );

    return result.rows.map(mapRow);
  }

  async findByEmployeeAndPolicy(
    employeeId: string,
    policyId: string
  ): Promise<LeaveBalance[]> {
    const result = await pool.query<BalanceRow>(
      `SELECT ${BALANCE_COLUMNS} FROM leave_balances WHERE employee_id = $1 AND policy_id = $2 ORDER BY fiscal_year DESC`,
      [employeeId, policyId]
    );

    return result.rows.map(mapRow);
  }

  async findByEmployeeAndFiscalYear(
    employeeId: string,
    policyId: string,
    fiscalYear: number
  ): Promise<LeaveBalance | null> {
    const result = await pool.query<BalanceRow>(
      `SELECT ${BALANCE_COLUMNS} FROM leave_balances WHERE employee_id = $1 AND policy_id = $2 AND fiscal_year = $3`,
      [employeeId, policyId, fiscalYear]
    );

    return result.rows[0] ? mapRow(result.rows[0]) : null;
  }

  async update(
    id: string,
    changes: UpdateLeaveBalanceInput,
    client?: PoolClient
  ): Promise<LeaveBalance> {
    const conn: Pool | PoolClient = client ?? pool;
    const now = new Date();

    const assignments: string[] = ['updated_at = $2'];
    const values: unknown[] = [id, now];
    let paramIndex = 2;

    const fields: ReadonlyArray<readonly [string, unknown]> = [
      ['total_entitlement', changes.totalEntitlement],
      ['used_days', changes.usedDays],
      ['remaining_days', changes.remainingDays],
      ['fiscal_year', changes.fiscalYear],
      ['status', changes.status],
    ];

    for (const [column, value] of fields) {
      if (value !== undefined) {
        paramIndex += 1;
        assignments.push(`${column} = $${paramIndex}`);
        values.push(value);
      }
    }

    try {
      const result = await conn.query<BalanceRow>(
        `UPDATE leave_balances SET ${assignments.join(', ')} WHERE id = $1 RETURNING ${BALANCE_COLUMNS}`,
        values
      );

      const row = result.rows[0];
      if (!row) {
        throw new BalanceNotFoundError(`Leave balance with id '${id}' not found`);
      }

      return mapRow(row);
    } catch (err) {
      if (isPgUniqueViolation(err)) {
        throw new UniqueConstraintError(
          'DUPLICATE_BALANCE',
          'A leave balance already exists for this employee, policy and fiscal year'
        );
      }
      throw err;
    }
  }

  async commitDays(
    employeeId: string,
    policyId: string,
    fiscalYear: number,
    days: number,
    client?: PoolClient
  ): Promise<LeaveBalance> {
    const conn: Pool | PoolClient = client ?? pool;

    const result = await conn.query<BalanceRow>(
      `UPDATE leave_balances
         SET used_days = used_days + $4,
             remaining_days = remaining_days - $4,
             updated_at = $5
       WHERE employee_id = $1
         AND policy_id = $2
         AND fiscal_year = $3
         AND remaining_days >= $4
       RETURNING ${BALANCE_COLUMNS}`,
      [employeeId, policyId, fiscalYear, days, new Date()]
    );

    const row = result.rows[0];
    if (row) {
      return mapRow(row);
    }

    const existing = await conn.query<BalanceRow>(
      `SELECT ${BALANCE_COLUMNS} FROM leave_balances WHERE employee_id = $1 AND policy_id = $2 AND fiscal_year = $3`,
      [employeeId, policyId, fiscalYear]
    );

    if (!existing.rows[0]) {
      throw new BalanceNotFoundError(
        `No leave balance for employee '${employeeId}', policy '${policyId}', fiscal year ${fiscalYear}`
      );
    }

    throw new InsufficientBalanceError(employeeId, policyId, fiscalYear);
  }
}
