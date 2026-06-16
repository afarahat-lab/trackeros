import { Pool } from 'pg';
import { LeaveBalance } from './balance.model';

export interface ILeaveBalanceRepository {
  findByEmployeeAndType(employeeId: string, leaveType: string, fiscalYear: number): Promise<LeaveBalance | null>;
  updateUsedDays(id: string, usedDays: number): Promise<LeaveBalance>;
  create(balance: Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeaveBalance>;
}

export class LeaveBalanceRepository implements ILeaveBalanceRepository {
  constructor(private readonly pool: Pool) {}

  async findByEmployeeAndType(employeeId: string, leaveType: string, fiscalYear: number): Promise<LeaveBalance | null> {
    const query = 'SELECT * FROM leave_balances WHERE employeeId = $1 AND leaveType = $2 AND fiscalYear = $3';
    const result = await this.pool.query<LeaveBalance>(query, [employeeId, leaveType, fiscalYear]);
    return result.rows[0] || null;
  }

  async updateUsedDays(id: string, usedDays: number): Promise<LeaveBalance> {
    const query = `
      UPDATE leave_balances
      SET usedDays = $1, remainingDays = entitlementDays - $1, updatedAt = NOW()
      WHERE id = $2
      RETURNING *
    `;
    const result = await this.pool.query<LeaveBalance>(query, [usedDays, id]);
    return result.rows[0];
  }

  async create(balance: Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeaveBalance> {
    const query = `
      INSERT INTO leave_balances (
        employeeId, leaveType, entitlementDays, usedDays,
        remainingDays, fiscalYear, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const remainingDays = balance.entitlementDays - balance.usedDays;
    const values = [
      balance.employeeId,
      balance.leaveType,
      balance.entitlementDays,
      balance.usedDays,
      remainingDays,
      balance.fiscalYear,
      balance.status
    ];
    const result = await this.pool.query<LeaveBalance>(query, values);
    return result.rows[0];
  }
}
