import { randomUUID } from 'crypto';
import { BaseRepository } from '../../shared/base-repository';
import { LeaveBalance } from './leave-balance.model';
import { ILeaveBalanceRepository } from './leave-balance.repository.interface';

interface LeaveBalanceRow {
  [key: string]: unknown;
  id: string;
  employee_id: string;
  leave_policy_id: string;
  total_entitlement: number;
  used_days: number;
  remaining_days: number;
  fiscal_year: number;
  status: 'ACTIVE' | 'EXHAUSTED' | 'CLOSED';
  created_at: Date;
  updated_at: Date;
}

function rowToLeaveBalance(row: LeaveBalanceRow): LeaveBalance {
  return {
    id: row.id,
    employeeId: row.employee_id,
    policyId: row.leave_policy_id,
    totalEntitlement: row.total_entitlement,
    usedDays: row.used_days,
    remainingDays: row.remaining_days,
    fiscalYear: row.fiscal_year,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function isLeaveBalanceRow(row: unknown): row is LeaveBalanceRow {
  if (typeof row !== 'object' || row === null) return false;
  const r = row as Record<string, unknown>;
  return (
    typeof r.id === 'string' &&
    typeof r.employee_id === 'string' &&
    typeof r.leave_policy_id === 'string' &&
    typeof r.total_entitlement === 'number' &&
    typeof r.used_days === 'number' &&
    typeof r.remaining_days === 'number' &&
    typeof r.fiscal_year === 'number' &&
    typeof r.status === 'string' &&
    ['ACTIVE', 'EXHAUSTED', 'CLOSED'].includes(r.status) &&
    r.created_at instanceof Date &&
    r.updated_at instanceof Date
  );
}

class LeaveBalanceBaseRepository extends BaseRepository {}

export class PgLeaveBalanceRepository implements ILeaveBalanceRepository {
  private readonly base = new LeaveBalanceBaseRepository();
  private readonly table = 'leave_balances';

  async findById(id: string): Promise<LeaveBalance | null> {
    const result = await this.base.query<LeaveBalanceRow>(
      `SELECT * FROM ${this.table} WHERE id = $1`,
      [id]
    );
    const row = result.rows[0];
    if (!row || !isLeaveBalanceRow(row)) return null;
    return rowToLeaveBalance(row);
  }

  async findByEmployeeId(employeeId: string): Promise<LeaveBalance[]> {
    const result = await this.base.query<LeaveBalanceRow>(
      `SELECT * FROM ${this.table} WHERE employee_id = $1`,
      [employeeId]
    );
    return result.rows.filter(isLeaveBalanceRow).map(rowToLeaveBalance);
  }

  async findByEmployeeAndPolicy(
    employeeId: string,
    policyId: string
  ): Promise<LeaveBalance | null> {
    const result = await this.base.query<LeaveBalanceRow>(
      `SELECT * FROM ${this.table} WHERE employee_id = $1 AND leave_policy_id = $2`,
      [employeeId, policyId]
    );
    const row = result.rows[0];
    if (!row || !isLeaveBalanceRow(row)) return null;
    return rowToLeaveBalance(row);
  }

  async findByEmployeeAndFiscalYear(
    employeeId: string,
    fiscalYear: number
  ): Promise<LeaveBalance[]> {
    const result = await this.base.query<LeaveBalanceRow>(
      `SELECT * FROM ${this.table} WHERE employee_id = $1 AND fiscal_year = $2`,
      [employeeId, fiscalYear]
    );
    return result.rows.filter(isLeaveBalanceRow).map(rowToLeaveBalance);
  }

  async create(
    balance: Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<LeaveBalance> {
    const id = randomUUID();
    const now = new Date();
    const data: Record<string, unknown> = {
      id,
      employee_id: balance.employeeId,
      leave_policy_id: balance.policyId,
      total_entitlement: balance.totalEntitlement,
      used_days: balance.usedDays,
      remaining_days: balance.remainingDays,
      fiscal_year: balance.fiscalYear,
      status: balance.status,
      created_at: now,
      updated_at: now,
    };
    const result = await this.base.query<LeaveBalanceRow>(
      `INSERT INTO ${this.table} (id, employee_id, leave_policy_id, total_entitlement, used_days, remaining_days, fiscal_year, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        data.id,
        data.employee_id,
        data.leave_policy_id,
        data.total_entitlement,
        data.used_days,
        data.remaining_days,
        data.fiscal_year,
        data.status,
        data.created_at,
        data.updated_at,
      ]
    );
    const row = result.rows[0];
    if (!row || !isLeaveBalanceRow(row)) {
      throw new Error('Failed to create leave balance');
    }
    return rowToLeaveBalance(row);
  }

  async update(
    id: string,
    balance: Partial<Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<LeaveBalance | null> {
    const now = new Date();
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (balance.employeeId !== undefined) {
      setClauses.push(`employee_id = $${paramIndex++}`);
      values.push(balance.employeeId);
    }
    if (balance.policyId !== undefined) {
      setClauses.push(`leave_policy_id = $${paramIndex++}`);
      values.push(balance.policyId);
    }
    if (balance.totalEntitlement !== undefined) {
      setClauses.push(`total_entitlement = $${paramIndex++}`);
      values.push(balance.totalEntitlement);
    }
    if (balance.usedDays !== undefined) {
      setClauses.push(`used_days = $${paramIndex++}`);
      values.push(balance.usedDays);
    }
    if (balance.remainingDays !== undefined) {
      setClauses.push(`remaining_days = $${paramIndex++}`);
      values.push(balance.remainingDays);
    }
    if (balance.fiscalYear !== undefined) {
      setClauses.push(`fiscal_year = $${paramIndex++}`);
      values.push(balance.fiscalYear);
    }
    if (balance.status !== undefined) {
      setClauses.push(`status = $${paramIndex++}`);
      values.push(balance.status);
    }

    if (setClauses.length === 0) {
      return this.findById(id);
    }

    setClauses.push(`updated_at = $${paramIndex++}`);
    values.push(now);
    values.push(id);

    const result = await this.base.query<LeaveBalanceRow>(
      `UPDATE ${this.table} SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    const row = result.rows[0];
    if (!row || !isLeaveBalanceRow(row)) return null;
    return rowToLeaveBalance(row);
  }

  async upsert(
    balance: Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<LeaveBalance> {
    const id = randomUUID();
    const now = new Date();
    const result = await this.base.query<LeaveBalanceRow>(
      `INSERT INTO ${this.table} (id, employee_id, leave_policy_id, total_entitlement, used_days, remaining_days, fiscal_year, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (employee_id, leave_policy_id, fiscal_year)
       DO UPDATE SET
         total_entitlement = EXCLUDED.total_entitlement,
         used_days = EXCLUDED.used_days,
         remaining_days = EXCLUDED.remaining_days,
         status = EXCLUDED.status,
         updated_at = EXCLUDED.updated_at
       RETURNING *`,
      [
        id,
        balance.employeeId,
        balance.policyId,
        balance.totalEntitlement,
        balance.usedDays,
        balance.remainingDays,
        balance.fiscalYear,
        balance.status,
        now,
        now,
      ]
    );
    const row = result.rows[0];
    if (!row || !isLeaveBalanceRow(row)) {
      throw new Error('Failed to create leave balance');
    }
    return rowToLeaveBalance(row);
  }
}
