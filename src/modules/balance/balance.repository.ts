import { Pool } from 'pg';
import { LeaveBalance, CreateLeaveBalanceDto } from './balance.model';

export interface ILeaveBalanceRepository {
  findById(id: string): Promise<LeaveBalance | null>;
  findByEmployeeIdAndYear(employeeId: string, year: number): Promise<LeaveBalance[]>;
  findByEmployeeIdAndLeaveTypeIdAndYear(employeeId: string, leaveTypeId: string, year: number): Promise<LeaveBalance | null>;
  findByEmployeeId(employeeId: string): Promise<LeaveBalance[]>;
  create(dto: CreateLeaveBalanceDto): Promise<LeaveBalance>;
  update(id: string, updates: Partial<Pick<LeaveBalance, 'usedDays' | 'pendingDays' | 'totalEntitlement'>>): Promise<LeaveBalance>;
}

export class LeaveBalanceRepository implements ILeaveBalanceRepository {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  private mapRow(row: any): LeaveBalance {
    return {
      id: row.id,
      employeeId: row.employee_id,
      leaveTypeId: row.leave_type_id,
      totalEntitlement: Number(row.total_entitlement),
      usedDays: Number(row.used_days),
      pendingDays: Number(row.pending_days),
      year: row.year,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async findById(id: string): Promise<LeaveBalance | null> {
    const result = await this.pool.query('SELECT * FROM leave_balances WHERE id = $1', [id]);
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  async findByEmployeeIdAndYear(employeeId: string, year: number): Promise<LeaveBalance[]> {
    const result = await this.pool.query('SELECT * FROM leave_balances WHERE employee_id = $1 AND year = $2', [employeeId, year]);
    return result.rows.map(this.mapRow);
  }

  async findByEmployeeIdAndLeaveTypeIdAndYear(employeeId: string, leaveTypeId: string, year: number): Promise<LeaveBalance | null> {
    const result = await this.pool.query('SELECT * FROM leave_balances WHERE employee_id = $1 AND leave_type_id = $2 AND year = $3', [employeeId, leaveTypeId, year]);
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  async findByEmployeeId(employeeId: string): Promise<LeaveBalance[]> {
    const result = await this.pool.query('SELECT * FROM leave_balances WHERE employee_id = $1', [employeeId]);
    return result.rows.map(this.mapRow);
  }

  async create(dto: CreateLeaveBalanceDto): Promise<LeaveBalance> {
    const result = await this.pool.query(
      `INSERT INTO leave_balances (employee_id, leave_type_id, total_entitlement, year)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [dto.employeeId, dto.leaveTypeId, dto.totalEntitlement, dto.year]
    );
    return this.mapRow(result.rows[0]);
  }

  async update(id: string, updates: Partial<Pick<LeaveBalance, 'usedDays' | 'pendingDays' | 'totalEntitlement'>>): Promise<LeaveBalance> {
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.usedDays !== undefined) {
      setClauses.push(`used_days = $${paramIndex++}`);
      values.push(updates.usedDays);
    }
    if (updates.pendingDays !== undefined) {
      setClauses.push(`pending_days = $${paramIndex++}`);
      values.push(updates.pendingDays);
    }
    if (updates.totalEntitlement !== undefined) {
      setClauses.push(`total_entitlement = $${paramIndex++}`);
      values.push(updates.totalEntitlement);
    }

    if (setClauses.length === 0) {
      throw new Error('No updates provided');
    }

    values.push(id);
    const query = `UPDATE leave_balances SET ${setClauses.join(', ')}, updated_at = now() WHERE id = $${paramIndex} RETURNING *`;
    const result = await this.pool.query(query, values);
    return this.mapRow(result.rows[0]);
  }
}
