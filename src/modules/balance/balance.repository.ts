import { randomUUID } from 'crypto';
import { pool } from '../../shared/db/connection';
import type { LeaveBalance, LeaveBalanceStatus, LeaveBalanceWithRemaining } from './balance.model';

interface LeaveBalanceRow {
  id: string;
  employee_id: string;
  leave_policy_id: string;
  total_entitlement: number;
  used_days: number;
  fiscal_year: number;
  status: string;
  created_at: Date;
  updated_at: Date;
}

function rowToLeaveBalance(row: LeaveBalanceRow): LeaveBalanceWithRemaining {
  return {
    id: row.id,
    employeeId: row.employee_id,
    leavePolicyId: row.leave_policy_id,
    totalEntitlement: row.total_entitlement,
    usedDays: row.used_days,
    remainingDays: row.total_entitlement - row.used_days,
    fiscalYear: row.fiscal_year,
    status: row.status as LeaveBalanceStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface ILeaveBalanceRepository {
  findByEmployeeAndPolicy(
    employeeId: string,
    leavePolicyId: string,
    fiscalYear: number,
  ): Promise<LeaveBalanceWithRemaining | null>;

  findByEmployeeId(
    employeeId: string,
    fiscalYear: number,
  ): Promise<LeaveBalanceWithRemaining[]>;

  create(
    balance: Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<LeaveBalanceWithRemaining>;

  updateUsedDays(id: string, usedDays: number): Promise<LeaveBalanceWithRemaining | null>;
}

export class PgLeaveBalanceRepository implements ILeaveBalanceRepository {
  async findByEmployeeAndPolicy(
    employeeId: string,
    leavePolicyId: string,
    fiscalYear: number,
  ): Promise<LeaveBalanceWithRemaining | null> {
    const result = await pool.query<LeaveBalanceRow>(
      'SELECT * FROM leave_balances WHERE employee_id = $1 AND leave_policy_id = $2 AND fiscal_year = $3',
      [employeeId, leavePolicyId, fiscalYear],
    );
    if (result.rows.length === 0) {
      return null;
    }
    return rowToLeaveBalance(result.rows[0]);
  }

  async findByEmployeeId(
    employeeId: string,
    fiscalYear: number,
  ): Promise<LeaveBalanceWithRemaining[]> {
    const result = await pool.query<LeaveBalanceRow>(
      'SELECT * FROM leave_balances WHERE employee_id = $1 AND fiscal_year = $2',
      [employeeId, fiscalYear],
    );
    return result.rows.map(rowToLeaveBalance);
  }

  async create(
    balance: Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<LeaveBalanceWithRemaining> {
    const id = randomUUID();
    const now = new Date();
    const result = await pool.query<LeaveBalanceRow>(
      `INSERT INTO leave_balances (
        id, employee_id, leave_policy_id, total_entitlement,
        used_days, fiscal_year, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        id,
        balance.employeeId,
        balance.leavePolicyId,
        balance.totalEntitlement,
        balance.usedDays,
        balance.fiscalYear,
        balance.status,
        now,
        now,
      ],
    );
    return rowToLeaveBalance(result.rows[0]);
  }

  async updateUsedDays(
    id: string,
    usedDays: number,
  ): Promise<LeaveBalanceWithRemaining | null> {
    const result = await pool.query<LeaveBalanceRow>(
      `UPDATE leave_balances SET used_days = $1, updated_at = $2
       WHERE id = $3
       RETURNING *`,
      [usedDays, new Date(), id],
    );
    if (result.rows.length === 0) {
      return null;
    }
    return rowToLeaveBalance(result.rows[0]);
  }
}
