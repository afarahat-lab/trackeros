import { pool } from '../../shared/db/connection';
import { LeaveBalance, CreateLeaveBalanceDto } from './leave-balance.model';

export interface ILeaveBalanceRepository {
  findByEmployeeId(employeeId: string): Promise<LeaveBalance[]>;
  findByEmployeeIdAndLeaveTypeId(employeeId: string, leaveTypeId: string): Promise<LeaveBalance | null>;
  findByEmployeeIdAndYear(employeeId: string, year: number): Promise<LeaveBalance[]>;
  create(dto: CreateLeaveBalanceDto): Promise<LeaveBalance>;
  update(id: string, dto: Partial<CreateLeaveBalanceDto>): Promise<LeaveBalance | null>;
  upsert(dto: CreateLeaveBalanceDto): Promise<LeaveBalance>;
}

export class LeaveBalanceRepository implements ILeaveBalanceRepository {
  async findByEmployeeId(employeeId: string): Promise<LeaveBalance[]> {
    const result = await pool.query<LeaveBalance>(
      'SELECT * FROM leave_balances WHERE employee_id = $1 AND deleted_at IS NULL ORDER BY year DESC, leave_type_id',
      [employeeId]
    );
    return result.rows;
  }

  async findByEmployeeIdAndLeaveTypeId(employeeId: string, leaveTypeId: string): Promise<LeaveBalance | null> {
    const result = await pool.query<LeaveBalance>(
      'SELECT * FROM leave_balances WHERE employee_id = $1 AND leave_type_id = $2 AND deleted_at IS NULL',
      [employeeId, leaveTypeId]
    );
    return result.rows[0] ?? null;
  }

  async findByEmployeeIdAndYear(employeeId: string, year: number): Promise<LeaveBalance[]> {
    const result = await pool.query<LeaveBalance>(
      'SELECT * FROM leave_balances WHERE employee_id = $1 AND year = $2 AND deleted_at IS NULL ORDER BY leave_type_id',
      [employeeId, year]
    );
    return result.rows;
  }

  async create(dto: CreateLeaveBalanceDto): Promise<LeaveBalance> {
    const result = await pool.query<LeaveBalance>(
      `INSERT INTO leave_balances (employee_id, leave_type_id, policy_id, entitlement_days, used_days, pending_days, accrued_days, carried_forward_days, expires_at, year)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        dto.employeeId,
        dto.leaveTypeId,
        dto.policyId,
        dto.entitlementDays,
        dto.usedDays ?? 0,
        dto.pendingDays ?? 0,
        dto.accruedDays ?? 0,
        dto.carriedForwardDays ?? 0,
        dto.expiresAt ?? null,
        dto.year,
      ]
    );
    return result.rows[0];
  }

  async update(id: string, dto: Partial<CreateLeaveBalanceDto>): Promise<LeaveBalance | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    const addField = (column: string, value: unknown) => {
      fields.push(`${column} = $${paramIndex++}`);
      values.push(value);
    };

    if (dto.employeeId !== undefined) addField('employee_id', dto.employeeId);
    if (dto.leaveTypeId !== undefined) addField('leave_type_id', dto.leaveTypeId);
    if (dto.policyId !== undefined) addField('policy_id', dto.policyId);
    if (dto.entitlementDays !== undefined) addField('entitlement_days', dto.entitlementDays);
    if (dto.usedDays !== undefined) addField('used_days', dto.usedDays);
    if (dto.pendingDays !== undefined) addField('pending_days', dto.pendingDays);
    if (dto.accruedDays !== undefined) addField('accrued_days', dto.accruedDays);
    if (dto.carriedForwardDays !== undefined) addField('carried_forward_days', dto.carriedForwardDays);
    if (dto.expiresAt !== undefined) addField('expires_at', dto.expiresAt);
    if (dto.year !== undefined) addField('year', dto.year);

    if (fields.length === 0) {
      const result = await pool.query<LeaveBalance>(
        'SELECT * FROM leave_balances WHERE id = $1 AND deleted_at IS NULL',
        [id]
      );
      return result.rows[0] ?? null;
    }

    fields.push('updated_at = NOW()');
    values.push(id);

    const result = await pool.query<LeaveBalance>(
      `UPDATE leave_balances SET ${fields.join(', ')} WHERE id = $${paramIndex} AND deleted_at IS NULL RETURNING *`,
      values
    );
    return result.rows[0] ?? null;
  }

  async upsert(dto: CreateLeaveBalanceDto): Promise<LeaveBalance> {
    const existing = await this.findByEmployeeIdAndLeaveTypeId(dto.employeeId, dto.leaveTypeId);

    if (existing) {
      const updated = await this.update(existing.id, dto);
      return updated!;
    }

    return this.create(dto);
  }
}
