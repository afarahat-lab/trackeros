import { pool } from '../../shared/db/connection';
import { LeaveBalance } from './leave-balance.model';

const COLUMN_MAP: Record<string, string> = {
  employeeId: 'employee_id',
  leaveTypeId: 'leave_type_id',
  policyId: 'policy_id',
  totalEntitlement: 'total_entitlement',
  usedDays: 'used_days',
  pendingDays: 'pending_days',
  fiscalYear: 'fiscal_year',
  status: 'status',
};

const READ_ONLY_FIELDS = new Set(['id', 'createdAt', 'updatedAt', 'remainingDays']);

function rowToLeaveBalance(row: Record<string, unknown>): LeaveBalance {
  const totalEntitlement = row.total_entitlement as number;
  const usedDays = row.used_days as number;
  return {
    id: row.id as string,
    employeeId: row.employee_id as string,
    leaveTypeId: row.leave_type_id as string,
    policyId: row.policy_id as string,
    totalEntitlement,
    usedDays,
    pendingDays: row.pending_days as number,
    remainingDays: totalEntitlement - usedDays,
    fiscalYear: row.fiscal_year as number,
    status: row.status as 'ACTIVE' | 'EXHAUSTED' | 'FROZEN',
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };
}

export interface ILeaveBalanceRepository {
  findById(id: string): Promise<LeaveBalance | null>;
  findByEmployeeAndType(employeeId: string, leaveTypeId: string, fiscalYear: number): Promise<LeaveBalance | null>;
  findByEmployee(employeeId: string, fiscalYear: number): Promise<LeaveBalance[]>;
  create(balance: Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt' | 'remainingDays'>): Promise<LeaveBalance>;
  update(id: string, data: Partial<LeaveBalance>): Promise<LeaveBalance | null>;
  incrementUsedDays(id: string, days: number): Promise<LeaveBalance | null>;
  decrementUsedDays(id: string, days: number): Promise<LeaveBalance | null>;
}

export class LeaveBalanceRepository implements ILeaveBalanceRepository {
  async findById(id: string): Promise<LeaveBalance | null> {
    const result = await pool.query(
      'SELECT * FROM leave_balances WHERE id = $1',
      [id],
    );
    if (result.rows.length === 0) {
      return null;
    }
    return rowToLeaveBalance(result.rows[0]);
  }

  async findByEmployeeAndType(
    employeeId: string,
    leaveTypeId: string,
    fiscalYear: number,
  ): Promise<LeaveBalance | null> {
    const result = await pool.query(
      'SELECT * FROM leave_balances WHERE employee_id = $1 AND leave_type_id = $2 AND fiscal_year = $3',
      [employeeId, leaveTypeId, fiscalYear],
    );
    if (result.rows.length === 0) {
      return null;
    }
    return rowToLeaveBalance(result.rows[0]);
  }

  async findByEmployee(employeeId: string, fiscalYear: number): Promise<LeaveBalance[]> {
    const result = await pool.query(
      'SELECT * FROM leave_balances WHERE employee_id = $1 AND fiscal_year = $2',
      [employeeId, fiscalYear],
    );
    return result.rows.map(rowToLeaveBalance);
  }

  async create(
    balance: Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt' | 'remainingDays'>,
  ): Promise<LeaveBalance> {
    const result = await pool.query(
      `INSERT INTO leave_balances (
        employee_id, leave_type_id, policy_id, total_entitlement,
        used_days, pending_days, fiscal_year, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        balance.employeeId,
        balance.leaveTypeId,
        balance.policyId,
        balance.totalEntitlement,
        balance.usedDays,
        balance.pendingDays,
        balance.fiscalYear,
        balance.status,
      ],
    );
    return rowToLeaveBalance(result.rows[0]);
  }

  async update(id: string, data: Partial<LeaveBalance>): Promise<LeaveBalance | null> {
    const keys = Object.keys(data).filter((k) => !READ_ONLY_FIELDS.has(k));
    if (keys.length === 0) {
      const existing = await this.findById(id);
      return existing;
    }

    const setClauses = keys.map((key, index) => {
      const column = COLUMN_MAP[key] ?? key;
      return `${column} = $${index + 2}`;
    });
    const values = keys.map((key) => (data as Record<string, unknown>)[key]);

    const result = await pool.query(
      `UPDATE leave_balances SET ${setClauses.join(', ')}, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, ...values],
    );
    if (result.rows.length === 0) {
      return null;
    }
    return rowToLeaveBalance(result.rows[0]);
  }

  async incrementUsedDays(id: string, days: number): Promise<LeaveBalance | null> {
    const result = await pool.query(
      `UPDATE leave_balances
       SET used_days = used_days + $2, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, days],
    );
    if (result.rows.length === 0) {
      return null;
    }
    return rowToLeaveBalance(result.rows[0]);
  }

  async decrementUsedDays(id: string, days: number): Promise<LeaveBalance | null> {
    const result = await pool.query(
      `UPDATE leave_balances
       SET used_days = used_days - $2, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, days],
    );
    if (result.rows.length === 0) {
      return null;
    }
    return rowToLeaveBalance(result.rows[0]);
  }
}
