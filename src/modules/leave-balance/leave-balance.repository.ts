import { PoolClient } from 'pg';
import { pool } from '../../shared/db/connection';
import { LeaveBalance } from './leave-balance.model';
import { BalanceStatus } from '../../shared/types/leave.types';
import { UniqueConstraintViolationError } from '../employee/employee.repository';

export interface ILeaveBalanceRepository {
  findByEmployeeAndPolicy(
    employeeId: string,
    policyId: string,
    fiscalYear?: number,
    client?: PoolClient,
  ): Promise<LeaveBalance | null>;

  findByEmployeeAndFiscalYear(
    employeeId: string,
    fiscalYear: number,
    client?: PoolClient,
  ): Promise<LeaveBalance[]>;

  findByEmployeeId(
    employeeId: string,
    client?: PoolClient,
  ): Promise<LeaveBalance[]>;

  create(
    input: Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt'>,
    client?: PoolClient,
  ): Promise<LeaveBalance>;

  update(
    id: string,
    updates: Partial<Pick<LeaveBalance, 'totalEntitlement' | 'fiscalYear' | 'status'>>,
    client?: PoolClient,
  ): Promise<LeaveBalance | null>;

  deductDays(
    id: string,
    days: number,
    client?: PoolClient,
  ): Promise<LeaveBalance | null>;

  restoreDays(
    id: string,
    days: number,
    client?: PoolClient,
  ): Promise<LeaveBalance | null>;
}

export class PgLeaveBalanceRepository implements ILeaveBalanceRepository {
  async findByEmployeeAndPolicy(
    employeeId: string,
    policyId: string,
    fiscalYear?: number,
    client?: PoolClient,
  ): Promise<LeaveBalance | null> {
    const db = client ?? pool;

    if (fiscalYear !== undefined) {
      const result = await db.query(
        `SELECT * FROM leave_balances
         WHERE employee_id = $1 AND policy_id = $2 AND fiscal_year = $3`,
        [employeeId, policyId, fiscalYear],
      );
      if (result.rows.length === 0) {
        return null;
      }
      return this.rowToLeaveBalance(result.rows[0]);
    }

    const result = await db.query(
      `SELECT * FROM leave_balances
       WHERE employee_id = $1 AND policy_id = $2`,
      [employeeId, policyId],
    );
    if (result.rows.length === 0) {
      return null;
    }
    return this.rowToLeaveBalance(result.rows[0]);
  }

  async findByEmployeeAndFiscalYear(
    employeeId: string,
    fiscalYear: number,
    client?: PoolClient,
  ): Promise<LeaveBalance[]> {
    const db = client ?? pool;
    const result = await db.query(
      `SELECT * FROM leave_balances
       WHERE employee_id = $1 AND fiscal_year = $2`,
      [employeeId, fiscalYear],
    );
    return result.rows.map((row) => this.rowToLeaveBalance(row));
  }

  async findByEmployeeId(
    employeeId: string,
    client?: PoolClient,
  ): Promise<LeaveBalance[]> {
    const db = client ?? pool;
    const result = await db.query(
      'SELECT * FROM leave_balances WHERE employee_id = $1',
      [employeeId],
    );
    return result.rows.map((row) => this.rowToLeaveBalance(row));
  }

  async create(
    input: Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt'>,
    client?: PoolClient,
  ): Promise<LeaveBalance> {
    const db = client ?? pool;
    try {
      const result = await db.query(
        `INSERT INTO leave_balances (
          employee_id, policy_id, total_entitlement, used_days,
          remaining_days, fiscal_year, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *`,
        [
          input.employeeId,
          input.policyId,
          input.totalEntitlement,
          input.usedDays,
          input.remainingDays,
          input.fiscalYear,
          input.status,
        ],
      );
      return this.rowToLeaveBalance(result.rows[0]);
    } catch (error: unknown) {
      if (this.isUniqueViolation(error)) {
        throw new UniqueConstraintViolationError(
          'Unique constraint violation on (employee_id, policy_id, fiscal_year)',
          error,
        );
      }
      throw error;
    }
  }

  async update(
    id: string,
    updates: Partial<Pick<LeaveBalance, 'totalEntitlement' | 'fiscalYear' | 'status'>>,
    client?: PoolClient,
  ): Promise<LeaveBalance | null> {
    const db = client ?? pool;

    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    const fieldMap: Record<string, string> = {
      totalEntitlement: 'total_entitlement',
      fiscalYear: 'fiscal_year',
      status: 'status',
    };

    for (const [key, column] of Object.entries(fieldMap)) {
      if (key in updates) {
        setClauses.push(`${column} = $${paramIndex}`);
        values.push((updates as Record<string, unknown>)[key]);
        paramIndex++;
      }
    }

    if (setClauses.length === 0) {
      const existing = await this.findById(id, client);
      return existing;
    }

    setClauses.push(`updated_at = NOW()`);

    values.push(id);

    const result = await db.query(
      `UPDATE leave_balances
       SET ${setClauses.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      values,
    );

    if (result.rows.length === 0) {
      return null;
    }
    return this.rowToLeaveBalance(result.rows[0]);
  }

  async deductDays(
    id: string,
    days: number,
    client?: PoolClient,
  ): Promise<LeaveBalance | null> {
    const db = client ?? pool;
    const result = await db.query(
      `UPDATE leave_balances
       SET used_days = used_days + $1,
           remaining_days = remaining_days - $1,
           status = CASE
             WHEN remaining_days - $1 <= 0 THEN $3
             ELSE status
           END,
           updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [days, id, BalanceStatus.EXHAUSTED],
    );
    if (result.rows.length === 0) {
      return null;
    }
    return this.rowToLeaveBalance(result.rows[0]);
  }

  async restoreDays(
    id: string,
    days: number,
    client?: PoolClient,
  ): Promise<LeaveBalance | null> {
    const db = client ?? pool;
    const result = await db.query(
      `UPDATE leave_balances
       SET used_days = used_days - $1,
           remaining_days = remaining_days + $1,
           status = CASE
             WHEN status = $3 AND remaining_days + $1 > 0 THEN $4
             ELSE status
           END,
           updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [days, id, BalanceStatus.EXHAUSTED, BalanceStatus.ACTIVE],
    );
    if (result.rows.length === 0) {
      return null;
    }
    return this.rowToLeaveBalance(result.rows[0]);
  }

  private async findById(
    id: string,
    client?: PoolClient,
  ): Promise<LeaveBalance | null> {
    const db = client ?? pool;
    const result = await db.query(
      'SELECT * FROM leave_balances WHERE id = $1',
      [id],
    );
    if (result.rows.length === 0) {
      return null;
    }
    return this.rowToLeaveBalance(result.rows[0]);
  }

  private rowToLeaveBalance(row: Record<string, unknown>): LeaveBalance {
    return {
      id: row.id as string,
      employeeId: row.employee_id as string,
      policyId: row.policy_id as string,
      totalEntitlement: row.total_entitlement as number,
      usedDays: row.used_days as number,
      remainingDays: row.remaining_days as number,
      fiscalYear: row.fiscal_year as number,
      status: row.status as BalanceStatus,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as Record<string, unknown>).code === '23505'
    );
  }
}
