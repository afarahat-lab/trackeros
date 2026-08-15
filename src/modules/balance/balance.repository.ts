import { Pool, PoolClient } from 'pg';
import { pool } from '../../shared/db/connection';
import { LeaveBalance } from './balance.model';

export interface IBalanceRepository {
  findById(id: string): Promise<LeaveBalance | null>;
  findByEmployeeAndPolicy(employeeId: string, policyId: string): Promise<LeaveBalance | null>;
  findByEmployeeAndFiscalYear(employeeId: string, fiscalYear: number): Promise<LeaveBalance[]>;
  create(balance: Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeaveBalance>;
  update(id: string, data: Partial<LeaveBalance>): Promise<LeaveBalance | null>;
  updateUsedDays(id: string, usedDays: number, remainingDays: number): Promise<LeaveBalance | null>;
}

function rowToBalance(row: Record<string, unknown>): LeaveBalance {
  return {
    id: row.id as string,
    employeeId: row.employee_id as string,
    policyId: row.leave_policy_id as string,
    totalEntitlement: Number(row.total_entitlement),
    usedDays: Number(row.used_days),
    remainingDays: Number(row.remaining_days),
    fiscalYear: Number(row.fiscal_year),
    status: row.status as 'ACTIVE' | 'EXHAUSTED' | 'FROZEN',
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };
}

export class BalanceRepository implements IBalanceRepository {
  private readonly db: Pool | PoolClient;

  constructor(client?: Pool | PoolClient) {
    this.db = client ?? pool;
  }

  async findById(id: string): Promise<LeaveBalance | null> {
    const result = await this.db.query(
      'SELECT * FROM leave_balances WHERE id = $1',
      [id],
    );
    if (result.rows.length === 0) {
      return null;
    }
    return rowToBalance(result.rows[0]);
  }

  async findByEmployeeAndPolicy(employeeId: string, policyId: string): Promise<LeaveBalance | null> {
    const result = await this.db.query(
      'SELECT * FROM leave_balances WHERE employee_id = $1 AND leave_policy_id = $2',
      [employeeId, policyId],
    );
    if (result.rows.length === 0) {
      return null;
    }
    return rowToBalance(result.rows[0]);
  }

  async findByEmployeeAndFiscalYear(employeeId: string, fiscalYear: number): Promise<LeaveBalance[]> {
    const result = await this.db.query(
      'SELECT * FROM leave_balances WHERE employee_id = $1 AND fiscal_year = $2 ORDER BY leave_policy_id',
      [employeeId, fiscalYear],
    );
    return result.rows.map(rowToBalance);
  }

  async create(
    balance: Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<LeaveBalance> {
    const now = new Date();
    const result = await this.db.query(
      `INSERT INTO leave_balances (
        employee_id, leave_policy_id, total_entitlement, used_days,
        remaining_days, fiscal_year, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        balance.employeeId,
        balance.policyId,
        balance.totalEntitlement,
        balance.usedDays,
        balance.remainingDays,
        balance.fiscalYear,
        balance.status,
        now,
        now,
      ],
    );
    return rowToBalance(result.rows[0]);
  }

  async update(id: string, data: Partial<LeaveBalance>): Promise<LeaveBalance | null> {
    const existing = await this.findById(id);
    if (!existing) {
      return null;
    }

    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    const fieldMap: Array<{ key: keyof LeaveBalance; column: string }> = [
      { key: 'totalEntitlement', column: 'total_entitlement' },
      { key: 'usedDays', column: 'used_days' },
      { key: 'remainingDays', column: 'remaining_days' },
      { key: 'fiscalYear', column: 'fiscal_year' },
      { key: 'status', column: 'status' },
    ];

    for (const { key, column } of fieldMap) {
      if (key in data) {
        fields.push(`${column} = $${paramIndex}`);
        values.push(data[key]);
        paramIndex++;
      }
    }

    if (fields.length === 0) {
      return existing;
    }

    fields.push(`updated_at = $${paramIndex}`);
    values.push(new Date());
    paramIndex++;

    values.push(id);

    const result = await this.db.query(
      `UPDATE leave_balances SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values,
    );

    if (result.rows.length === 0) {
      return null;
    }
    return rowToBalance(result.rows[0]);
  }

  async updateUsedDays(id: string, usedDays: number, remainingDays: number): Promise<LeaveBalance | null> {
    const now = new Date();
    const result = await this.db.query(
      `UPDATE leave_balances
       SET used_days = $1, remaining_days = $2, updated_at = $3
       WHERE id = $4
       RETURNING *`,
      [usedDays, remainingDays, now, id],
    );
    if (result.rows.length === 0) {
      return null;
    }
    return rowToBalance(result.rows[0]);
  }
}
