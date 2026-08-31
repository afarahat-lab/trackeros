import { PoolClient } from 'pg';
import { pool } from '../../shared/db/connection';
import {
  ILeaveBalanceRepository,
  LeaveBalance,
  NegativeBalanceCounterError,
} from './balance.model';

interface BalanceRow {
  id: string;
  employee_id: string;
  policy_id: string;
  total_entitlement: number;
  used_days: number;
  remaining_days: number;
  fiscal_year: number;
  status: LeaveBalance['status'];
  created_at: Date;
  updated_at: Date;
}

function toBalance(row: BalanceRow): LeaveBalance {
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

function assertCountersNonNegative(balance: LeaveBalance): void {
  if (balance.totalEntitlement < 0) {
    throw new NegativeBalanceCounterError('totalEntitlement cannot be negative');
  }
  if (balance.usedDays < 0) {
    throw new NegativeBalanceCounterError('usedDays cannot be negative');
  }
  if (balance.remainingDays < 0) {
    throw new NegativeBalanceCounterError('remainingDays cannot be negative');
  }
}

export class PgLeaveBalanceRepository implements ILeaveBalanceRepository {
  async create(balance: LeaveBalance, client?: PoolClient): Promise<LeaveBalance> {
    assertCountersNonNegative(balance);
    const db = client ?? pool;
    const result = await db.query<BalanceRow>(
      `INSERT INTO leave_balances (
         id, employee_id, policy_id, total_entitlement, used_days,
         remaining_days, fiscal_year, status, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        balance.id,
        balance.employeeId,
        balance.policyId,
        balance.totalEntitlement,
        balance.usedDays,
        balance.remainingDays,
        balance.fiscalYear,
        balance.status,
        balance.createdAt,
        balance.updatedAt,
      ],
    );
    return toBalance(result.rows[0]);
  }

  async findById(id: string, client?: PoolClient): Promise<LeaveBalance | null> {
    const db = client ?? pool;
    const result = await db.query<BalanceRow>(
      `SELECT * FROM leave_balances WHERE id = $1`,
      [id],
    );
    return result.rows[0] ? toBalance(result.rows[0]) : null;
  }

  async findByEmployee(
    employeeId: string,
    client?: PoolClient,
  ): Promise<LeaveBalance[]> {
    const db = client ?? pool;
    const result = await db.query<BalanceRow>(
      `SELECT * FROM leave_balances
       WHERE employee_id = $1
       ORDER BY fiscal_year DESC, created_at ASC`,
      [employeeId],
    );
    return result.rows.map(toBalance);
  }

  async deduct(id: string, days: number, client?: PoolClient): Promise<LeaveBalance> {
    if (days < 0) {
      throw new NegativeBalanceCounterError('days cannot be negative');
    }
    const db = client ?? pool;
    const result = await db.query<BalanceRow>(
      `UPDATE leave_balances
       SET used_days = used_days + $2,
           remaining_days = remaining_days - $2,
           updated_at = NOW()
       WHERE id = $1 AND remaining_days >= $2
       RETURNING *`,
      [id, days],
    );
    if (!result.rows[0]) {
      throw new NegativeBalanceCounterError(
        'deduct would take remainingDays below zero',
      );
    }
    return toBalance(result.rows[0]);
  }

  async restore(
    id: string,
    days: number,
    client?: PoolClient,
  ): Promise<LeaveBalance> {
    if (days < 0) {
      throw new NegativeBalanceCounterError('days cannot be negative');
    }
    const db = client ?? pool;
    const result = await db.query<BalanceRow>(
      `UPDATE leave_balances
       SET used_days = used_days - $2,
           remaining_days = remaining_days + $2,
           updated_at = NOW()
       WHERE id = $1 AND used_days >= $2
       RETURNING *`,
      [id, days],
    );
    if (!result.rows[0]) {
      throw new NegativeBalanceCounterError(
        'restore would take usedDays below zero',
      );
    }
    return toBalance(result.rows[0]);
  }
}
