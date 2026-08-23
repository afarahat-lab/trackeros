import { randomUUID } from 'crypto';
import { pool } from 'shared/db/connection';
import {
  LeaveBalance,
  IBalanceRepository,
  BalanceStatus,
  BalanceNotFoundError,
} from './balance.model';

type DbRow = Record<string, unknown>;

export class BalanceRepository implements IBalanceRepository {
  async findByEmployeeAndYear(
    employeeId: string,
    fiscalYear: number
  ): Promise<LeaveBalance[]> {
    const result = await pool.query(
      'SELECT * FROM leave_balances WHERE employee_id = $1 AND fiscal_year = $2',
      [employeeId, fiscalYear]
    );
    return (result.rows as DbRow[]).map((r) => this.mapRow(r));
  }

  async findByEmployeeYearAndPolicy(
    employeeId: string,
    fiscalYear: number,
    policyId: string
  ): Promise<LeaveBalance | null> {
    const result = await pool.query(
      'SELECT * FROM leave_balances WHERE employee_id = $1 AND fiscal_year = $2 AND policy_id = $3',
      [employeeId, fiscalYear, policyId]
    );
    const rows = result.rows as DbRow[];
    return rows.length === 0 ? null : this.mapRow(rows[0]);
  }

  async create(
    balance: Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt' | 'remainingDays'>
  ): Promise<LeaveBalance> {
    const id = randomUUID();
    const result = await pool.query(
      `INSERT INTO leave_balances (
        id, employee_id, policy_id, total_entitlement, used_days,
        pending_days, fiscal_year, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        id,
        balance.employeeId,
        balance.policyId,
        balance.totalEntitlement,
        balance.usedDays,
        balance.pendingDays,
        balance.fiscalYear,
        balance.status,
      ]
    );
    return this.mapRow((result.rows as DbRow[])[0]);
  }

  async update(
    id: string,
    data: Partial<LeaveBalance>
  ): Promise<LeaveBalance | null> {
    const clauses: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    const fieldMap: Array<[string, keyof LeaveBalance]> = [
      ['total_entitlement', 'totalEntitlement'],
      ['used_days', 'usedDays'],
      ['pending_days', 'pendingDays'],
      ['fiscal_year', 'fiscalYear'],
      ['status', 'status'],
    ];

    for (const [col, key] of fieldMap) {
      if (key in data) {
        clauses.push(`${col} = $${idx}`);
        values.push(data[key]);
        idx++;
      }
    }

    if (clauses.length === 0) {
      return this.findById(id);
    }

    clauses.push('updated_at = NOW()');
    values.push(id);

    const result = await pool.query(
      `UPDATE leave_balances SET ${clauses.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );

    const rows = result.rows as DbRow[];
    return rows.length === 0 ? null : this.mapRow(rows[0]);
  }

  async deductPendingDays(
    id: string,
    days: number
  ): Promise<LeaveBalance | null> {
    const result = await pool.query(
      `UPDATE leave_balances
       SET pending_days = pending_days + $1,
           updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [days, id]
    );
    const rows = result.rows as DbRow[];
    return rows.length === 0 ? null : this.mapRow(rows[0]);
  }

  async commitDeduction(
    id: string,
    days: number
  ): Promise<LeaveBalance | null> {
    const result = await pool.query(
      `UPDATE leave_balances
       SET pending_days = pending_days - $1,
           used_days = used_days + $1,
           updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [days, id]
    );
    const rows = result.rows as DbRow[];
    return rows.length === 0 ? null : this.mapRow(rows[0]);
  }

  async restorePendingDays(
    id: string,
    days: number
  ): Promise<LeaveBalance | null> {
    const result = await pool.query(
      `UPDATE leave_balances
       SET pending_days = pending_days - $1,
           updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [days, id]
    );
    const rows = result.rows as DbRow[];
    return rows.length === 0 ? null : this.mapRow(rows[0]);
  }

  async findById(id: string): Promise<LeaveBalance | null> {
    const result = await pool.query(
      'SELECT * FROM leave_balances WHERE id = $1',
      [id]
    );
    const rows = result.rows as DbRow[];
    return rows.length === 0 ? null : this.mapRow(rows[0]);
  }

  private mapRow(row: DbRow): LeaveBalance {
    const totalEntitlement = Number(row.total_entitlement);
    const usedDays = Number(row.used_days);
    const pendingDays = Number(row.pending_days);
    return {
      id: row.id as string,
      employeeId: row.employee_id as string,
      policyId: row.policy_id as string,
      totalEntitlement,
      usedDays,
      pendingDays,
      remainingDays: totalEntitlement - usedDays - pendingDays,
      fiscalYear: Number(row.fiscal_year),
      status: row.status as BalanceStatus,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
    };
  }
}
