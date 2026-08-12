import { pool } from '../../shared/db/connection';
import { LeaveBalance } from './balance.model';

interface BalanceRow {
  id: string;
  employee_id: string;
  policy_id: string;
  fiscal_year: number;
  total_entitlement: number;
  used_days: number;
  remaining_days: number;
  status: 'ACTIVE' | 'EXHAUSTED' | 'CLOSED';
  created_at: Date;
  updated_at: Date;
}

function rowToBalance(row: BalanceRow): LeaveBalance {
  return {
    id: row.id,
    employeeId: row.employee_id,
    policyId: row.policy_id,
    fiscalYear: row.fiscal_year,
    totalEntitlement: row.total_entitlement,
    usedDays: row.used_days,
    remainingDays: row.remaining_days,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface ILeaveBalanceRepository {
  findById(id: string): Promise<LeaveBalance | null>;
  findByEmployeeAndPolicy(employeeId: string, policyId: string, fiscalYear: number): Promise<LeaveBalance | null>;
  findByEmployee(employeeId: string, fiscalYear: number): Promise<LeaveBalance[]>;
  create(data: Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeaveBalance>;
  update(id: string, data: Partial<Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt'>>): Promise<LeaveBalance>;
}

export class LeaveBalanceRepository implements ILeaveBalanceRepository {
  async findById(id: string): Promise<LeaveBalance | null> {
    const result = await pool.query<BalanceRow>(
      'SELECT * FROM leave_balances WHERE id = $1',
      [id],
    );

    if (result.rows.length === 0) {
      return null;
    }

    return rowToBalance(result.rows[0]);
  }

  async findByEmployeeAndPolicy(
    employeeId: string,
    policyId: string,
    fiscalYear: number,
  ): Promise<LeaveBalance | null> {
    const result = await pool.query<BalanceRow>(
      'SELECT * FROM leave_balances WHERE employee_id = $1 AND policy_id = $2 AND fiscal_year = $3',
      [employeeId, policyId, fiscalYear],
    );

    if (result.rows.length === 0) {
      return null;
    }

    return rowToBalance(result.rows[0]);
  }

  async findByEmployee(employeeId: string, fiscalYear: number): Promise<LeaveBalance[]> {
    const result = await pool.query<BalanceRow>(
      'SELECT * FROM leave_balances WHERE employee_id = $1 AND fiscal_year = $2',
      [employeeId, fiscalYear],
    );

    return result.rows.map(rowToBalance);
  }

  async create(data: Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeaveBalance> {
    const id = crypto.randomUUID();
    const now = new Date();

    await pool.query(
      `INSERT INTO leave_balances (
        id, employee_id, policy_id, fiscal_year, total_entitlement,
        used_days, remaining_days, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        id,
        data.employeeId,
        data.policyId,
        data.fiscalYear,
        data.totalEntitlement,
        data.usedDays,
        data.remainingDays,
        data.status,
        now,
        now,
      ],
    );

    const result = await pool.query<BalanceRow>(
      'SELECT * FROM leave_balances WHERE id = $1',
      [id],
    );

    return rowToBalance(result.rows[0]);
  }

  async update(
    id: string,
    data: Partial<Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<LeaveBalance> {
    const now = new Date();

    const fieldMap: Record<string, string> = {
      employeeId: 'employee_id',
      policyId: 'policy_id',
      fiscalYear: 'fiscal_year',
      totalEntitlement: 'total_entitlement',
      usedDays: 'used_days',
      remainingDays: 'remaining_days',
      status: 'status',
    };

    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    for (const [camelKey, colName] of Object.entries(fieldMap)) {
      if (camelKey in data) {
        setClauses.push(`${colName} = $${paramIndex}`);
        values.push((data as Record<string, unknown>)[camelKey]);
        paramIndex++;
      }
    }

    setClauses.push(`updated_at = $${paramIndex}`);
    values.push(now);
    paramIndex++;

    values.push(id);

    await pool.query(
      `UPDATE leave_balances SET ${setClauses.join(', ')} WHERE id = $${paramIndex}`,
      values,
    );

    const result = await pool.query<BalanceRow>(
      'SELECT * FROM leave_balances WHERE id = $1',
      [id],
    );

    return rowToBalance(result.rows[0]);
  }
}
