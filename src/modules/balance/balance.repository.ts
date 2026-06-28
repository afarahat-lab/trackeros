import { Pool } from 'pg';
import { pool } from '../../shared/db/connection';
import { LeaveBalance, CreateLeaveBalanceDto } from './balance.model';
import { LeaveType } from '../../shared/types/leave.types';

export interface ILeaveBalanceRepository {
  findByEmployeeAndType(employeeId: string, leaveType: LeaveType, fiscalYear: number): Promise<LeaveBalance | null>;
  findByEmployee(employeeId: string): Promise<LeaveBalance[]>;
  create(dto: CreateLeaveBalanceDto): Promise<LeaveBalance>;
  updateBalance(id: string, newBalance: number): Promise<LeaveBalance>;
  decrementBalance(id: string, days: number): Promise<LeaveBalance>;
}

export class LeaveBalanceRepository implements ILeaveBalanceRepository {
  constructor(private readonly db: Pool = pool) {}

  async findByEmployeeAndType(employeeId: string, leaveType: LeaveType, fiscalYear: number): Promise<LeaveBalance | null> {
    const result = await this.db.query<LeaveBalance>(
      'SELECT * FROM leave_balances WHERE employee_id = $1 AND leave_type = $2 AND fiscal_year = $3',
      [employeeId, leaveType, fiscalYear]
    );
    return result.rows[0] || null;
  }

  async findByEmployee(employeeId: string): Promise<LeaveBalance[]> {
    const result = await this.db.query<LeaveBalance>(
      'SELECT * FROM leave_balances WHERE employee_id = $1',
      [employeeId]
    );
    return result.rows;
  }

  async create(dto: CreateLeaveBalanceDto): Promise<LeaveBalance> {
    const { employeeId, leaveType, balance, fiscalYear } = dto;
    const result = await this.db.query<LeaveBalance>(
      `INSERT INTO leave_balances (employee_id, leave_type, balance, fiscal_year)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [employeeId, leaveType, balance, fiscalYear]
    );
    return result.rows[0];
  }

  async updateBalance(id: string, newBalance: number): Promise<LeaveBalance> {
    const result = await this.db.query<LeaveBalance>(
      `UPDATE leave_balances
       SET balance = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [newBalance, id]
    );
    return result.rows[0];
  }

  async decrementBalance(id: string, days: number): Promise<LeaveBalance> {
    const result = await this.db.query<LeaveBalance>(
      `UPDATE leave_balances
       SET balance = balance - $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [days, id]
    );
    return result.rows[0];
  }
}
