import { Pool } from 'pg';
import { BaseRepository } from '../../shared/base-repository';
import { LeaveBalance } from './leave-balance.model';

export interface ILeaveBalanceRepository {
  findById(id: string): Promise<LeaveBalance | null>;
  findByEmployeeId(employeeId: string): Promise<LeaveBalance[]>;
  findByEmployeeAndPolicy(employeeId: string, policyId: string, fiscalYear: number): Promise<LeaveBalance | null>;
  create(balance: Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeaveBalance>;
  update(id: string, balance: Partial<Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt'>>): Promise<LeaveBalance | null>;
  upsert(balance: Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeaveBalance>;
}

export class LeaveBalanceRepository extends BaseRepository<LeaveBalance> implements ILeaveBalanceRepository {
  constructor(poolOverride?: Pool) {
    super(poolOverride);
  }

  async findById(id: string): Promise<LeaveBalance | null> {
    const result = await this.query(
      'SELECT * FROM leave_balance WHERE id = $1',
      [id],
    );
    return result.rows[0] ?? null;
  }

  async findByEmployeeId(employeeId: string): Promise<LeaveBalance[]> {
    const result = await this.query(
      'SELECT * FROM leave_balance WHERE employee_id = $1 ORDER BY fiscal_year DESC',
      [employeeId],
    );
    return result.rows;
  }

  async findByEmployeeAndPolicy(employeeId: string, policyId: string, fiscalYear: number): Promise<LeaveBalance | null> {
    const result = await this.query(
      'SELECT * FROM leave_balance WHERE employee_id = $1 AND leave_policy_id = $2 AND fiscal_year = $3',
      [employeeId, policyId, fiscalYear],
    );
    return result.rows[0] ?? null;
  }

  async create(balance: Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeaveBalance> {
    const result = await this.query(
      `INSERT INTO leave_balance (
        employee_id, leave_policy_id, total_entitlement, used_days,
        remaining_days, pending_days, fiscal_year, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        balance.employeeId,
        balance.policyId,
        balance.totalEntitlement,
        balance.usedDays,
        balance.remainingDays,
        balance.pendingDays,
        balance.fiscalYear,
        balance.status,
      ],
    );
    return result.rows[0];
  }

  async update(
    id: string,
    balance: Partial<Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<LeaveBalance | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    const fieldMap: Array<[keyof typeof balance, string]> = [
      ['employeeId', 'employee_id'],
      ['policyId', 'leave_policy_id'],
      ['totalEntitlement', 'total_entitlement'],
      ['usedDays', 'used_days'],
      ['remainingDays', 'remaining_days'],
      ['pendingDays', 'pending_days'],
      ['fiscalYear', 'fiscal_year'],
      ['status', 'status'],
    ];

    for (const [key, column] of fieldMap) {
      if (balance[key] !== undefined) {
        fields.push(`${column} = $${paramIndex}`);
        values.push(balance[key]);
        paramIndex++;
      }
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await this.query(
      `UPDATE leave_balance SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values,
    );
    return result.rows[0] ?? null;
  }

  async upsert(balance: Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeaveBalance> {
    const result = await this.query(
      `INSERT INTO leave_balance (
        employee_id, leave_policy_id, total_entitlement, used_days,
        remaining_days, pending_days, fiscal_year, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (employee_id, leave_policy_id, fiscal_year)
      DO UPDATE SET
        total_entitlement = EXCLUDED.total_entitlement,
        used_days = EXCLUDED.used_days,
        remaining_days = EXCLUDED.remaining_days,
        pending_days = EXCLUDED.pending_days,
        status = EXCLUDED.status,
        updated_at = NOW()
      RETURNING *`,
      [
        balance.employeeId,
        balance.policyId,
        balance.totalEntitlement,
        balance.usedDays,
        balance.remainingDays,
        balance.pendingDays,
        balance.fiscalYear,
        balance.status,
      ],
    );
    return result.rows[0];
  }
}
