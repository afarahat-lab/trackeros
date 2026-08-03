import { Pool, QueryResult } from 'pg';
import { pool } from '../../shared/db/connection';
import { LeaveBalance } from './leave-balance.model';

export interface ILeaveBalanceRepository {
  findByEmployeeAndPolicy(
    employeeId: string,
    leavePolicyId: string,
    fiscalYear: number,
  ): Promise<LeaveBalance | null>;
  findByEmployee(employeeId: string, fiscalYear: number): Promise<LeaveBalance[]>;
  create(
    balance: Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt' | 'remainingDays'>,
  ): Promise<LeaveBalance>;
  updateUsedDays(id: string, usedDays: number): Promise<LeaveBalance>;
}

function rowToLeaveBalance(row: Record<string, unknown>): LeaveBalance {
  const totalEntitlement = row.total_entitlement as number;
  const usedDays = row.used_days as number;
  return {
    id: row.id as string,
    employeeId: row.employee_id as string,
    leavePolicyId: row.leave_policy_id as string,
    totalEntitlement,
    usedDays,
    remainingDays: totalEntitlement - usedDays,
    fiscalYear: row.fiscal_year as number,
    status: row.status as 'ACTIVE' | 'EXHAUSTED' | 'CLOSED',
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };
}

export class LeaveBalanceRepository implements ILeaveBalanceRepository {
  private readonly db: Pool;

  constructor(dbPool: Pool = pool) {
    this.db = dbPool;
  }

  async findByEmployeeAndPolicy(
    employeeId: string,
    leavePolicyId: string,
    fiscalYear: number,
  ): Promise<LeaveBalance | null> {
    try {
      const result: QueryResult = await this.db.query(
        'SELECT * FROM leave_balances WHERE employee_id = $1 AND leave_policy_id = $2 AND fiscal_year = $3',
        [employeeId, leavePolicyId, fiscalYear],
      );
      if (result.rows.length === 0) {
        return null;
      }
      return rowToLeaveBalance(result.rows[0] as Record<string, unknown>);
    } catch (error: unknown) {
      throw new Error(
        `Failed to find leave balance by employee and policy: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async findByEmployee(
    employeeId: string,
    fiscalYear: number,
  ): Promise<LeaveBalance[]> {
    try {
      const result: QueryResult = await this.db.query(
        'SELECT * FROM leave_balances WHERE employee_id = $1 AND fiscal_year = $2',
        [employeeId, fiscalYear],
      );
      return (result.rows as Record<string, unknown>[]).map(rowToLeaveBalance);
    } catch (error: unknown) {
      throw new Error(
        `Failed to find leave balances by employee: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async create(
    balance: Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt' | 'remainingDays'>,
  ): Promise<LeaveBalance> {
    try {
      const result: QueryResult = await this.db.query(
        `INSERT INTO leave_balances (employee_id, leave_policy_id, total_entitlement, used_days, fiscal_year, status)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          balance.employeeId,
          balance.leavePolicyId,
          balance.totalEntitlement,
          balance.usedDays,
          balance.fiscalYear,
          balance.status,
        ],
      );
      return rowToLeaveBalance(result.rows[0] as Record<string, unknown>);
    } catch (error: unknown) {
      throw new Error(
        `Failed to create leave balance: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async updateUsedDays(id: string, usedDays: number): Promise<LeaveBalance> {
    try {
      const result: QueryResult = await this.db.query(
        'UPDATE leave_balances SET used_days = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        [usedDays, id],
      );
      return rowToLeaveBalance(result.rows[0] as Record<string, unknown>);
    } catch (error: unknown) {
      throw new Error(
        `Failed to update used days: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
