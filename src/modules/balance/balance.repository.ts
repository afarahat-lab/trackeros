import { Pool } from "pg";
import { LeaveBalance } from "../../shared/types";
import { IBalanceRepository } from "./balance.repository.interface";

export class BalanceRepository implements IBalanceRepository {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async findByEmployeeAndTypeAndYear(employeeId: string, leaveTypeId: string, year: number): Promise<LeaveBalance | null> {
    const result = await this.pool.query(
      'SELECT * FROM leave_balances WHERE employee_id = $1 AND leave_type_id = $2 AND year = $3',
      [employeeId, leaveTypeId, year]
    );
    return result.rows[0] || null;
  }

  async findByEmployee(employeeId: string, year?: number): Promise<LeaveBalance[]> {
    let query = 'SELECT * FROM leave_balances WHERE employee_id = $1';
    const params: any[] = [employeeId];
    
    if (year !== undefined) {
      query += ' AND year = $2';
      params.push(year);
    }
    
    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async updateBalance(employeeId: string, leaveTypeId: string, year: number, daysUsed: number): Promise<LeaveBalance> {
    const result = await this.pool.query(
      'UPDATE leave_balances SET days_used = $1 WHERE employee_id = $2 AND leave_type_id = $3 AND year = $4 RETURNING *',
      [daysUsed, employeeId, leaveTypeId, year]
    );
    return result.rows[0];
  }
}
