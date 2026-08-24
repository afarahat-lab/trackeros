import { pool } from 'shared/db/connection';
import {
  LeaveBalance,
  IBalanceRepository,
  BalanceStatus,
  DuplicateBalanceError,
} from './balance.model';
import { randomUUID } from 'crypto';

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
    const rows = result.rows as DbRow[];
    return rows.map((row) => this.mapRow(row));
  }

  async findByEmployeeYearAndPolicy(
    employeeId: string,
    fiscalYear: number,
    policyId: string
  ): Promise<LeaveBalance | null> {
    const result = await pool.query(
      `SELECT * FROM leave_balances
       WHERE employee_id = $1 AND fiscal_year = $2 AND policy_id = $3`,
      [employeeId, fiscalYear, policyId]
    );
    const rows = result.rows as DbRow[];
    if (rows.length === 0) return null;
    return this.mapRow(rows[0]);
  }

  async create(
    data: Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<LeaveBalance> {
    const existing = await this.findByEmployeeYearAndPolicy(
      data.employeeId,
      data.fiscalYear,
      data.policyId
    );
    if (existing) {
      throw new DuplicateBalanceError(
        data.employeeId,
        data.policyId,
        data.fiscalYear
      );
    }

    const id = randomUUID();

    const result = await pool.query(
      `INSERT INTO leave_balances (
        id, employee_id, policy_id, total_entitlement,
        used_days, pending_days, fiscal_year, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        id,
        data.employeeId,
        data.policyId,
        data.totalEntitlement,
        data.usedDays,
        data.pendingDays,
        data.fiscalYear,
        data.status,
      ]
    );
    const rows = result.rows as DbRow[];
    return this.mapRow(rows[0]);
  }

  async update(
    id: string,
    data: Partial<LeaveBalance>
  ): Promise<LeaveBalance | null> {
    const clauses: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    const fieldMap: Array<[string, keyof LeaveBalance]> = [
      ['employee_id', 'employeeId'],
      ['policy_id', 'policyId'],
      ['total_entitlement', 'totalEntitlement'],
      ['used_days', 'usedDays'],
      ['pending_days', 'pendingDays'],
      ['fiscal_year', 'fiscalYear'],
      ['status', 'status'],
    ];

    for (const [col, key] of fieldMap) {
      if (key in data) {
        clauses.push(`${col} = $${idx}`);
        values.push(data[key as keyof Partial<LeaveBalance>]);
        idx++;
      }
    }

    if (clauses.length === 0) {
      return this.findById(id);
    }

    clauses.push(`updated_at = NOW()`);

    values.push(id);
    const result = await pool.query(
      `UPDATE leave_balances SET ${clauses.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );

    const rows = result.rows as DbRow[];
    if (rows.length === 0) return null;
    return this.mapRow(rows[0]);
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
         AND (pending_days + $1) <= (total_entitlement - used_days)
       RETURNING *`,
      [days, id]
    );
    const rows = result.rows as DbRow[];
    if (rows.length === 0) return null;
    return this.mapRow(rows[0]);
  }

  async commitDeduction(
    id: string,
    days: number
  ): Promise<LeaveBalance | null> {
    const result = await pool.query(
      `UPDATE leave_balances
       SET used_days = used_days + $1,
           pending_days = pending_days - $1,
           updated_at = NOW()
       WHERE id = $2 AND pending_days >= $1
       RETURNING *`,
      [days, id]
    );
    const rows = result.rows as DbRow[];
    if (rows.length === 0) return null;
    return this.mapRow(rows[0]);
  }

  async restorePendingDays(
    id: string,
    days: number
  ): Promise<LeaveBalance | null> {
    const result = await pool.query(
      `UPDATE leave_balances
       SET pending_days = pending_days - $1,
           updated_at = NOW()
       WHERE id = $2 AND pending_days >= $1
       RETURNING *`,
      [days, id]
    );
    const rows = result.rows as DbRow[];
    if (rows.length === 0) return null;
    return this.mapRow(rows[0]);
  }

  private async findById(id: string): Promise<LeaveBalance | null> {
    const result = await pool.query(
      'SELECT * FROM leave_balances WHERE id = $1',
      [id]
    );
    const rows = result.rows as DbRow[];
    if (rows.length === 0) return null;
    return this.mapRow(rows[0]);
  }

  private mapRow(row: DbRow): LeaveBalance {
    return new LeaveBalance({
      id: row.id as string,
      employeeId: row.employee_id as string,
      policyId: row.policy_id as string,
      totalEntitlement: row.total_entitlement as number,
      usedDays: row.used_days as number,
      pendingDays: row.pending_days as number,
      fiscalYear: row.fiscal_year as number,
      status: row.status as BalanceStatus,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
    });
  }
}
