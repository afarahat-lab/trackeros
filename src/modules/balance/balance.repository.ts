import { pool } from "../../shared/db/connection";
import { LeaveBalance, CreateLeaveBalanceDto } from "./balance.model";

export interface ILeaveBalanceRepository {
  findById(id: string): Promise<LeaveBalance | null>;
  findByEmployeeAndYear(employeeId: string, year: number): Promise<LeaveBalance[]>;
  findByEmployeeLeaveTypeAndYear(employeeId: string, leaveTypeId: string, year: number): Promise<LeaveBalance | null>;
  create(dto: CreateLeaveBalanceDto): Promise<LeaveBalance>;
  updateUsedDays(id: string, usedDays: number): Promise<LeaveBalance>;
}

export class LeaveBalanceRepository implements ILeaveBalanceRepository {
  async findById(id: string): Promise<LeaveBalance | null> {
    const result = await pool.query('SELECT * FROM leave_balances WHERE id = $1', [id]);
    return result.rows[0] ? this._mapRow(result.rows[0]) : null;
  }

  async findByEmployeeAndYear(employeeId: string, year: number): Promise<LeaveBalance[]> {
    const result = await pool.query('SELECT * FROM leave_balances WHERE employee_id = $1 AND year = $2', [employeeId, year]);
    return result.rows.map(this._mapRow);
  }

  async findByEmployeeLeaveTypeAndYear(employeeId: string, leaveTypeId: string, year: number): Promise<LeaveBalance | null> {
    const result = await pool.query('SELECT * FROM leave_balances WHERE employee_id = $1 AND leave_type_id = $2 AND year = $3', [employeeId, leaveTypeId, year]);
    return result.rows[0] ? this._mapRow(result.rows[0]) : null;
  }

  async create(dto: CreateLeaveBalanceDto): Promise<LeaveBalance> {
    const result = await pool.query(
      'INSERT INTO leave_balances (employee_id, leave_type_id, year, total_days, used_days) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [dto.employeeId, dto.leaveTypeId, dto.year, dto.totalDays, dto.usedDays ?? 0]
    );
    return this._mapRow(result.rows[0]);
  }

  async updateUsedDays(id: string, usedDays: number): Promise<LeaveBalance> {
    const result = await pool.query(
      'UPDATE leave_balances SET used_days = $1 WHERE id = $2 RETURNING *',
      [usedDays, id]
    );
    return this._mapRow(result.rows[0]);
  }

  private _mapRow(row: any): LeaveBalance {
    return {
      id: row.id,
      employeeId: row.employee_id,
      leaveTypeId: row.leave_type_id,
      year: row.year,
      totalDays: row.total_days,
      usedDays: row.used_days,
      remainingDays: row.remaining_days,
    };
  }
}
