import { pool } from '../../shared/db/connection';
import { LeaveBalance } from './balance.model';
import { ILeaveBalanceRepository } from './balance.repository.interface';
import { BalanceStatus } from '../../shared/types/index';

export class PgLeaveBalanceRepository implements ILeaveBalanceRepository {
  private static readonly VALID_STATUSES: ReadonlySet<string> = new Set(Object.values(BalanceStatus));

  async findByEmployeeAndPolicy(employeeId: string, leavePolicyId: string): Promise<LeaveBalance | null> {
    try {
      const result = await pool.query(
        `SELECT id, employee_id, leave_policy_id, total_entitlement, used_days,
                remaining_days, fiscal_year, status, created_at, updated_at
         FROM leave_balances
         WHERE employee_id = $1 AND leave_policy_id = $2`,
        [employeeId, leavePolicyId]
      );
      if (result.rows.length === 0) return null;
      return this.mapRowToBalance(result.rows[0]);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to find balance by employee and policy: ${message}`);
    }
  }

  async findByEmployee(employeeId: string): Promise<LeaveBalance[]> {
    try {
      const result = await pool.query(
        `SELECT id, employee_id, leave_policy_id, total_entitlement, used_days,
                remaining_days, fiscal_year, status, created_at, updated_at
         FROM leave_balances
         WHERE employee_id = $1
         ORDER BY fiscal_year DESC, leave_policy_id`,
        [employeeId]
      );
      return result.rows.map(row => this.mapRowToBalance(row));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to find balances by employee: ${message}`);
    }
  }

  async create(balance: Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeaveBalance> {
    try {
      const result = await pool.query(
        `INSERT INTO leave_balances (employee_id, leave_policy_id, total_entitlement, used_days, remaining_days, fiscal_year, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, employee_id, leave_policy_id, total_entitlement, used_days, remaining_days, fiscal_year, status, created_at, updated_at`,
        [
          balance.employeeId,
          balance.leavePolicyId,
          balance.totalEntitlement,
          balance.usedDays,
          balance.remainingDays,
          balance.fiscalYear,
          balance.status,
        ]
      );
      return this.mapRowToBalance(result.rows[0]);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to create balance: ${message}`);
    }
  }

  async update(id: string, data: Partial<LeaveBalance>): Promise<LeaveBalance | null> {
    try {
      const setClauses: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      if (data.employeeId !== undefined) {
        setClauses.push(`employee_id = $${paramIndex++}`);
        values.push(data.employeeId);
      }
      if (data.leavePolicyId !== undefined) {
        setClauses.push(`leave_policy_id = $${paramIndex++}`);
        values.push(data.leavePolicyId);
      }
      if (data.totalEntitlement !== undefined) {
        setClauses.push(`total_entitlement = $${paramIndex++}`);
        values.push(data.totalEntitlement);
      }
      if (data.usedDays !== undefined) {
        setClauses.push(`used_days = $${paramIndex++}`);
        values.push(data.usedDays);
      }
      if (data.remainingDays !== undefined) {
        setClauses.push(`remaining_days = $${paramIndex++}`);
        values.push(data.remainingDays);
      }
      if (data.fiscalYear !== undefined) {
        setClauses.push(`fiscal_year = $${paramIndex++}`);
        values.push(data.fiscalYear);
      }
      if (data.status !== undefined) {
        setClauses.push(`status = $${paramIndex++}`);
        values.push(data.status);
      }

      if (setClauses.length === 0) {
        return null; // self-contained: no findById delegation
      }

      setClauses.push(`updated_at = NOW()`);
      values.push(id);

      const result = await pool.query(
        `UPDATE leave_balances SET ${setClauses.join(', ')} WHERE id = $${paramIndex}
         RETURNING id, employee_id, leave_policy_id, total_entitlement, used_days, remaining_days, fiscal_year, status, created_at, updated_at`,
        values
      );

      if (result.rows.length === 0) return null;
      return this.mapRowToBalance(result.rows[0]);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to update balance: ${message}`);
    }
  }

  async deductDays(id: string, days: number): Promise<LeaveBalance | null> {
    try {
      const result = await pool.query(
        `UPDATE leave_balances
         SET remaining_days = remaining_days - $1,
             used_days = used_days + $1,
             updated_at = NOW()
         WHERE id = $2
         RETURNING id, employee_id, leave_policy_id, total_entitlement, used_days, remaining_days, fiscal_year, status, created_at, updated_at`,
        [days, id]
      );
      if (result.rows.length === 0) return null;
      return this.mapRowToBalance(result.rows[0]);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to deduct days from balance: ${message}`);
    }
  }

  private mapRowToBalance(row: Record<string, unknown>): LeaveBalance {
    const rawStatus = row.status as string;
    if (!PgLeaveBalanceRepository.VALID_STATUSES.has(rawStatus)) {
      throw new Error(`Invalid balance status from database: ${rawStatus}`);
    }
    return {
      id: row.id as string,
      employeeId: row.employee_id as string,
      leavePolicyId: row.leave_policy_id as string,
      totalEntitlement: Number(row.total_entitlement),
      usedDays: Number(row.used_days),
      remainingDays: Number(row.remaining_days),
      fiscalYear: Number(row.fiscal_year),
      status: rawStatus as BalanceStatus,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }
}
