import { pool } from '../../shared/db/connection';
import { LeaveBalance, BalanceStatus } from './balance.model';

export interface IBalanceRepository {
  findByEmployeeAndPolicy(
    employeeId: string,
    policyId: string,
    fiscalYear: number,
  ): Promise<LeaveBalance | null>;
  findByEmployee(
    employeeId: string,
    fiscalYear: number,
  ): Promise<LeaveBalance[]>;
  create(balance: CreateLeaveBalanceInput): Promise<LeaveBalance>;
  incrementUsedDays(id: string, days: number): Promise<LeaveBalance | null>;
  decrementUsedDays(id: string, days: number): Promise<LeaveBalance | null>;
}

export interface CreateLeaveBalanceInput {
  id: string;
  employeeId: string;
  policyId: string;
  totalEntitlement: number;
  usedDays: number;
  fiscalYear: number;
  status: BalanceStatus;
}

interface LeaveBalanceRow {
  id: string;
  employee_id: string;
  policy_id: string;
  total_entitlement: number;
  used_days: number;
  fiscal_year: number;
  status: string;
  created_at: Date;
  updated_at: Date;
}

function mapRowToLeaveBalance(row: LeaveBalanceRow): LeaveBalance {
  return {
    id: row.id,
    employeeId: row.employee_id,
    policyId: row.policy_id,
    totalEntitlement: row.total_entitlement,
    usedDays: row.used_days,
    remainingDays: row.total_entitlement - row.used_days,
    fiscalYear: row.fiscal_year,
    status: row.status as BalanceStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const SELECT_CLAUSE = `
  SELECT id, employee_id, policy_id, total_entitlement, used_days,
         fiscal_year, status, created_at, updated_at
  FROM leave_balances
`;

export class BalanceRepository implements IBalanceRepository {
  async findByEmployeeAndPolicy(
    employeeId: string,
    policyId: string,
    fiscalYear: number,
  ): Promise<LeaveBalance | null> {
    const result = await pool.query(
      `${SELECT_CLAUSE} WHERE employee_id = $1 AND policy_id = $2 AND fiscal_year = $3`,
      [employeeId, policyId, fiscalYear],
    );
    if (result.rows.length === 0) {
      return null;
    }
    return mapRowToLeaveBalance(result.rows[0] as LeaveBalanceRow);
  }

  async findByEmployee(
    employeeId: string,
    fiscalYear: number,
  ): Promise<LeaveBalance[]> {
    const result = await pool.query(
      `${SELECT_CLAUSE} WHERE employee_id = $1 AND fiscal_year = $2`,
      [employeeId, fiscalYear],
    );
    return result.rows.map((row: LeaveBalanceRow) => mapRowToLeaveBalance(row));
  }

  async create(balance: CreateLeaveBalanceInput): Promise<LeaveBalance> {
    const result = await pool.query(
      `INSERT INTO leave_balances (
        id, employee_id, policy_id, total_entitlement, used_days,
        fiscal_year, status, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, NOW(), NOW()
      ) RETURNING *`,
      [
        balance.id,
        balance.employeeId,
        balance.policyId,
        balance.totalEntitlement,
        balance.usedDays,
        balance.fiscalYear,
        balance.status,
      ],
    );
    return mapRowToLeaveBalance(result.rows[0] as LeaveBalanceRow);
  }

  async incrementUsedDays(
    id: string,
    days: number,
  ): Promise<LeaveBalance | null> {
    const result = await pool.query(
      `UPDATE leave_balances
       SET used_days = used_days + $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [days, id],
    );
    if (result.rows.length === 0) {
      return null;
    }
    return mapRowToLeaveBalance(result.rows[0] as LeaveBalanceRow);
  }

  async decrementUsedDays(
    id: string,
    days: number,
  ): Promise<LeaveBalance | null> {
    const result = await pool.query(
      `UPDATE leave_balances
       SET used_days = used_days - $1, updated_at = NOW()
       WHERE id = $2 AND used_days >= $1
       RETURNING *`,
      [days, id],
    );
    if (result.rows.length === 0) {
      return null;
    }
    return mapRowToLeaveBalance(result.rows[0] as LeaveBalanceRow);
  }
}
