import { pool } from '../../shared/db/connection';
import { LeaveBalance, LeaveBalanceStatus } from './leave-balance.model';

export interface ILeaveBalanceRepository {
  findById(id: string): Promise<LeaveBalance | null>;
  findByEmployeeId(employeeId: string): Promise<LeaveBalance[]>;
  findByEmployeeAndPolicy(employeeId: string, policyId: string): Promise<LeaveBalance | null>;
  findByEmployeeAndFiscalYear(employeeId: string, fiscalYear: number): Promise<LeaveBalance[]>;
  save(balance: LeaveBalance): Promise<LeaveBalance>;
  update(id: string, partial: Partial<LeaveBalance>): Promise<LeaveBalance | null>;
  incrementUsedDays(id: string, days: number): Promise<LeaveBalance | null>;
}

export class PgLeaveBalanceRepository implements ILeaveBalanceRepository {
  async findById(id: string): Promise<LeaveBalance | null> {
    const result = await pool.query(
      'SELECT * FROM leave_balances WHERE id = $1',
      [id]
    );
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  async findByEmployeeId(employeeId: string): Promise<LeaveBalance[]> {
    const result = await pool.query(
      'SELECT * FROM leave_balances WHERE employee_id = $1',
      [employeeId]
    );
    return result.rows.map((row: Record<string, unknown>) => this.mapRow(row));
  }

  async findByEmployeeAndPolicy(employeeId: string, policyId: string): Promise<LeaveBalance | null> {
    const result = await pool.query(
      'SELECT * FROM leave_balances WHERE employee_id = $1 AND policy_id = $2',
      [employeeId, policyId]
    );
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  async findByEmployeeAndFiscalYear(employeeId: string, fiscalYear: number): Promise<LeaveBalance[]> {
    const result = await pool.query(
      'SELECT * FROM leave_balances WHERE employee_id = $1 AND fiscal_year = $2',
      [employeeId, fiscalYear]
    );
    return result.rows.map((row: Record<string, unknown>) => this.mapRow(row));
  }

  async save(balance: LeaveBalance): Promise<LeaveBalance> {
    const existing = await this.findExisting(balance.employeeId, balance.policyId, balance.fiscalYear);
    if (existing) {
      throw new Error(
        `Duplicate leave balance: employee ${balance.employeeId} already has a balance for policy ${balance.policyId} in fiscal year ${balance.fiscalYear}`
      );
    }

    const result = await pool.query(
      `INSERT INTO leave_balances (id, employee_id, policy_id, total_entitlement, used_days, remaining_days, fiscal_year, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        balance.id,
        balance.employeeId,
        balance.policyId,
        balance.totalEntitlement,
        balance.usedDays,
        balance.totalEntitlement - balance.usedDays,
        balance.fiscalYear,
        balance.status,
        balance.createdAt,
        balance.updatedAt,
      ]
    );
    return this.mapRow(result.rows[0]);
  }

  async update(id: string, partial: Partial<LeaveBalance>): Promise<LeaveBalance | null> {
    const existing = await this.findById(id);
    if (!existing) {
      return null;
    }

    const merged = { ...existing, ...partial, id, updatedAt: new Date() };
    merged.remainingDays = merged.totalEntitlement - merged.usedDays;
    const result = await pool.query(
      `UPDATE leave_balances SET
        employee_id = $1, policy_id = $2, total_entitlement = $3,
        used_days = $4, remaining_days = $5, fiscal_year = $6,
        status = $7, created_at = $8, updated_at = $9
       WHERE id = $10
       RETURNING *`,
      [
        merged.employeeId,
        merged.policyId,
        merged.totalEntitlement,
        merged.usedDays,
        merged.remainingDays,
        merged.fiscalYear,
        merged.status,
        merged.createdAt,
        merged.updatedAt,
        id,
      ]
    );
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  async incrementUsedDays(id: string, days: number): Promise<LeaveBalance | null> {
    const existing = await this.findById(id);
    if (!existing) {
      return null;
    }

    if (existing.status !== 'ACTIVE') {
      throw new Error(
        `Balance ${id} is not ACTIVE (status: ${existing.status}); only ACTIVE balances can be modified`
      );
    }

    const result = await pool.query(
      `UPDATE leave_balances SET
        used_days = used_days + $2,
        remaining_days = total_entitlement - (used_days + $2),
        updated_at = NOW()
       WHERE id = $1 AND (used_days + $2) <= total_entitlement
       RETURNING *`,
      [id, days]
    );

    if (!result.rows[0]) {
      throw new Error(
        `Increment of ${days} day(s) would exceed total entitlement of ${existing.totalEntitlement} for balance ${id}`
      );
    }

    return this.mapRow(result.rows[0]);
  }

  private async findExisting(employeeId: string, policyId: string, fiscalYear: number): Promise<LeaveBalance | null> {
    const result = await pool.query(
      'SELECT * FROM leave_balances WHERE employee_id = $1 AND policy_id = $2 AND fiscal_year = $3',
      [employeeId, policyId, fiscalYear]
    );
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  private mapRow(row: Record<string, unknown>): LeaveBalance {
    return {
      id: row.id as string,
      employeeId: row.employee_id as string,
      policyId: row.policy_id as string,
      totalEntitlement: row.total_entitlement as number,
      usedDays: row.used_days as number,
      remainingDays: row.remaining_days as number,
      fiscalYear: row.fiscal_year as number,
      status: row.status as LeaveBalanceStatus,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
    };
  }
}
