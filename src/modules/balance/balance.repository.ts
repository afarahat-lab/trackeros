import { pool } from '../../shared/db/connection';
import { BalanceStatus } from '../../shared/types';
import { Balance, IBalanceRepository } from './balance.model';

interface BalanceRow {
  id: string;
  employee_id: string;
  leave_type: string;
  total_entitlement: number;
  used_days: number;
  remaining_days: number;
  fiscal_year: number;
  status: string;
  created_at: Date;
  updated_at: Date;
}

function mapRowToBalance(row: BalanceRow): Balance {
  return {
    id: row.id,
    employeeId: row.employee_id,
    leaveType: row.leave_type,
    totalEntitlement: row.total_entitlement,
    usedDays: row.used_days,
    remainingDays: row.remaining_days,
    fiscalYear: row.fiscal_year,
    status: row.status as BalanceStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const COLUMN_MAP: Record<string, string> = {
  employeeId: 'employee_id',
  leaveType: 'leave_type',
  totalEntitlement: 'total_entitlement',
  usedDays: 'used_days',
  remainingDays: 'remaining_days',
  fiscalYear: 'fiscal_year',
  status: 'status',
};

export class PgBalanceRepository implements IBalanceRepository {
  async findByEmployeeId(employeeId: string): Promise<Balance[]> {
    const result = await pool.query<BalanceRow>(
      'SELECT * FROM balances WHERE employee_id = $1',
      [employeeId],
    );
    return result.rows.map(mapRowToBalance);
  }

  async findByEmployeeIdAndLeaveType(
    employeeId: string,
    leaveType: string,
  ): Promise<Balance | null> {
    const result = await pool.query<BalanceRow>(
      'SELECT * FROM balances WHERE employee_id = $1 AND leave_type = $2',
      [employeeId, leaveType],
    );
    if (result.rows.length === 0) {
      return null;
    }
    return mapRowToBalance(result.rows[0]);
  }

  async findByEmployeeIdAndFiscalYear(
    employeeId: string,
    fiscalYear: number,
  ): Promise<Balance[]> {
    const result = await pool.query<BalanceRow>(
      'SELECT * FROM balances WHERE employee_id = $1 AND fiscal_year = $2',
      [employeeId, fiscalYear],
    );
    return result.rows.map(mapRowToBalance);
  }

  async create(
    balance: Omit<Balance, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Balance> {
    const result = await pool.query<BalanceRow>(
      `INSERT INTO balances (
        employee_id, leave_type, total_entitlement,
        used_days, remaining_days, fiscal_year, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        balance.employeeId,
        balance.leaveType,
        balance.totalEntitlement,
        balance.usedDays,
        balance.remainingDays,
        balance.fiscalYear,
        balance.status,
      ],
    );
    return mapRowToBalance(result.rows[0]);
  }

  async update(
    id: string,
    data: Partial<Balance>,
  ): Promise<Balance | null> {
    const keys = Object.keys(data).filter(
      (k) =>
        data[k as keyof typeof data] !== undefined &&
        COLUMN_MAP[k] !== undefined,
    );

    if (keys.length === 0) {
      const existing = await this.findById(id);
      return existing;
    }

    const setClauses = keys.map(
      (key, index) => `${COLUMN_MAP[key]} = $${index + 2}`,
    );
    const values = keys.map((key) => data[key as keyof typeof data]);

    const result = await pool.query<BalanceRow>(
      `UPDATE balances SET ${setClauses.join(', ')}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, ...values],
    );

    if (result.rows.length === 0) {
      return null;
    }
    return mapRowToBalance(result.rows[0]);
  }

  async deductDays(id: string, days: number): Promise<Balance | null> {
    const result = await pool.query<BalanceRow>(
      `UPDATE balances
       SET remaining_days = remaining_days - $2,
           used_days = used_days + $2,
           status = CASE WHEN remaining_days - $2 <= 0 THEN 'exhausted' ELSE status END,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, days],
    );

    if (result.rows.length === 0) {
      return null;
    }
    return mapRowToBalance(result.rows[0]);
  }

  private async findById(id: string): Promise<Balance | null> {
    const result = await pool.query<BalanceRow>(
      'SELECT * FROM balances WHERE id = $1',
      [id],
    );
    if (result.rows.length === 0) {
      return null;
    }
    return mapRowToBalance(result.rows[0]);
  }
}
