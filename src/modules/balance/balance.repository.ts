import { pool } from '../../shared/db/connection';
import {
  LeaveBalance,
  BalanceStatus,
  IBalanceRepository,
  InsufficientBalanceError,
} from './balance.model';

export class BalanceRepository implements IBalanceRepository {
  async findByEmployeeAndPolicy(
    employeeId: string,
    policyId: string,
    fiscalYear: number,
  ): Promise<LeaveBalance | null> {
    const result = await pool.query(
      `SELECT * FROM leave_balances
       WHERE employee_id = $1 AND policy_id = $2 AND fiscal_year = $3`,
      [employeeId, policyId, fiscalYear],
    );
    if (result.rows.length === 0) {
      return null;
    }
    return this.mapRow(result.rows[0]);
  }

  async findByEmployeeId(
    employeeId: string,
    fiscalYear?: number,
  ): Promise<LeaveBalance[]> {
    let query = 'SELECT * FROM leave_balances WHERE employee_id = $1';
    const params: unknown[] = [employeeId];

    if (fiscalYear !== undefined) {
      query += ' AND fiscal_year = $2';
      params.push(fiscalYear);
    }

    query += ' ORDER BY fiscal_year DESC, policy_id';

    const result = await pool.query(query, params);
    return result.rows.map((row: Record<string, unknown>) => this.mapRow(row));
  }

  async create(
    data: Omit<LeaveBalance, 'id' | 'remainingDays' | 'createdAt' | 'updatedAt'>,
  ): Promise<LeaveBalance> {
    const result = await pool.query(
      `INSERT INTO leave_balances (employee_id, policy_id, total_entitlement, used_days, fiscal_year, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        data.employeeId,
        data.policyId,
        data.totalEntitlement,
        data.usedDays,
        data.fiscalYear,
        data.status,
      ],
    );
    return this.mapRow(result.rows[0]);
  }

  async updateUsedDays(id: string, usedDays: number): Promise<LeaveBalance | null> {
    const result = await pool.query(
      `UPDATE leave_balances SET used_days = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [usedDays, id],
    );
    if (result.rows.length === 0) {
      return null;
    }
    return this.mapRow(result.rows[0]);
  }

  async incrementUsedDays(id: string, days: number): Promise<LeaveBalance | null> {
    const result = await pool.query(
      `UPDATE leave_balances
       SET used_days = used_days + $1, updated_at = NOW()
       WHERE id = $2 AND total_entitlement - used_days - $1 >= 0
       RETURNING *`,
      [days, id],
    );

    if (result.rows.length > 0) {
      return this.mapRow(result.rows[0]);
    }

    const exists = await pool.query('SELECT id, total_entitlement, used_days FROM leave_balances WHERE id = $1', [id]);
    if (exists.rows.length === 0) {
      return null;
    }

    const row = exists.rows[0] as { total_entitlement: number; used_days: number };
    const available = row.total_entitlement - row.used_days;
    throw new InsufficientBalanceError(id, days, available);
  }

  async decrementUsedDays(id: string, days: number): Promise<LeaveBalance | null> {
    const result = await pool.query(
      `UPDATE leave_balances
       SET used_days = used_days - $1, updated_at = NOW()
       WHERE id = $2 AND used_days - $1 >= 0
       RETURNING *`,
      [days, id],
    );

    if (result.rows.length === 0) {
      return null;
    }
    return this.mapRow(result.rows[0]);
  }

  private mapRow(row: Record<string, unknown>): LeaveBalance {
    const totalEntitlement = row.total_entitlement as number;
    const usedDays = row.used_days as number;

    return {
      id: row.id as string,
      employeeId: row.employee_id as string,
      policyId: row.policy_id as string,
      totalEntitlement,
      usedDays,
      remainingDays: totalEntitlement - usedDays,
      fiscalYear: row.fiscal_year as number,
      status: row.status as BalanceStatus,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }
}
