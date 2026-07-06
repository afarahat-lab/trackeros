
import { Pool } from 'pg';
import { pool } from '../../shared/db/connection';
import { LeaveBalance, LeaveBalanceQueryParams } from './balance.model';

export interface ILeaveBalanceRepository {
  findByEmployeeId(employeeId: number): Promise<LeaveBalance[]>;
  findByEmployeeAndPolicy(employeeId: number, policyId: number): Promise<LeaveBalance | null>;
  findByEmployeeAndFiscalYear(employeeId: number, fiscalYear: number): Promise<LeaveBalance[]>;
  create(balance: Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeaveBalance>;
  update(id: number, balance: Partial<Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt'>>): Promise<LeaveBalance | null>;
  deductDays(id: number, days: number): Promise<LeaveBalance | null>;
  restoreDays(id: number, days: number): Promise<LeaveBalance | null>;
}

export class LeaveBalanceRepository implements ILeaveBalanceRepository {
  private readonly db: Pool;

  constructor(dbPool: Pool = pool) {
    this.db = dbPool;
  }

  async findByEmployeeId(employeeId: number): Promise<LeaveBalance[]> {
    const result = await this.db.query<LeaveBalance>(
      'SELECT * FROM leave_balances WHERE employee_id = $1',
      [employeeId]
    );
    return result.rows;
  }

  async findByEmployeeAndPolicy(employeeId: number, policyId: number): Promise<LeaveBalance | null> {
    const result = await this.db.query<LeaveBalance>(
      'SELECT * FROM leave_balances WHERE employee_id = $1 AND policy_id = $2',
      [employeeId, policyId]
    );
    return result.rows[0] ?? null;
  }

  async findByEmployeeAndFiscalYear(employeeId: number, fiscalYear: number): Promise<LeaveBalance[]> {
    const result = await this.db.query<LeaveBalance>(
      'SELECT * FROM leave_balances WHERE employee_id = $1 AND fiscal_year = $2',
      [employeeId, fiscalYear]
    );
    return result.rows;
  }

  async create(balance: Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeaveBalance> {
    const result = await this.db.query<LeaveBalance>(
      `INSERT INTO leave_balances (
        employee_id, policy_id, total_entitlement, used_days,
        pending_days, available_days, fiscal_year
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        balance.employeeId,
        balance.policyId,
        balance.totalEntitlement,
        balance.usedDays,
        balance.pendingDays,
        balance.availableDays,
        balance.fiscalYear,
      ]
    );
    return result.rows[0];
  }

  async update(
    id: number,
    balance: Partial<Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<LeaveBalance | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    const fieldMap: Array<[keyof typeof balance, string]> = [
      ['employeeId', 'employee_id'],
      ['policyId', 'policy_id'],
      ['totalEntitlement', 'total_entitlement'],
      ['usedDays', 'used_days'],
      ['pendingDays', 'pending_days'],
      ['availableDays', 'available_days'],
      ['fiscalYear', 'fiscal_year'],
    ];

    for (const [key, column] of fieldMap) {
      if (balance[key] !== undefined) {
        fields.push(`${column} = $${paramIndex}`);
        values.push(balance[key]);
        paramIndex++;
      }
    }

    if (fields.length === 0) {
      return null;
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await this.db.query<LeaveBalance>(
      `UPDATE leave_balances SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    return result.rows[0] ?? null;
  }

  async deductDays(id: number, days: number): Promise<LeaveBalance | null> {
    const result = await this.db.query<LeaveBalance>(
      `UPDATE leave_balances
       SET used_days = used_days + $2,
           available_days = total_entitlement - (used_days + $2) - pending_days,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, days]
    );
    return result.rows[0] ?? null;
  }

  async restoreDays(id: number, days: number): Promise<LeaveBalance | null> {
    const result = await this.db.query<LeaveBalance>(
      `UPDATE leave_balances
       SET used_days = GREATEST(used_days - $2, 0),
           available_days = total_entitlement - GREATEST(used_days - $2, 0) - pending_days,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, days]
    );
    return result.rows[0] ?? null;
  }
}
