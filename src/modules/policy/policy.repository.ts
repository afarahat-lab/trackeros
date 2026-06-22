import { Pool } from 'pg';
import { LeavePolicy, CreateLeavePolicyDto } from './policy.model';

export interface ILeavePolicyRepository {
  findById(id: string): Promise<LeavePolicy | null>;
  findByLeaveTypeId(leaveTypeId: string): Promise<LeavePolicy | null>;
  create(dto: CreateLeavePolicyDto): Promise<LeavePolicy>;
  update(id: string, dto: Partial<CreateLeavePolicyDto>): Promise<LeavePolicy>;
  archive(id: string): Promise<LeavePolicy>;
}

export class LeavePolicyRepository implements ILeavePolicyRepository {
  constructor(private pool: Pool) {}

  async findById(id: string): Promise<LeavePolicy | null> {
    const result = await this.pool.query(
      'SELECT * FROM leave_type_policies WHERE id = $1',
      [id]
    );
    if (!result.rows || result.rows.length === 0) {
      return null;
    }
    return this.mapRowToPolicy(result.rows[0]);
  }

  async findByLeaveTypeId(leaveTypeId: string): Promise<LeavePolicy | null> {
    const result = await this.pool.query(
      'SELECT * FROM leave_type_policies WHERE leave_type_id = $1',
      [leaveTypeId]
    );
    if (!result.rows || result.rows.length === 0) {
      return null;
    }
    return this.mapRowToPolicy(result.rows[0]);
  }

  async create(dto: CreateLeavePolicyDto): Promise<LeavePolicy> {
    const {
      leaveTypeId,
      maxDaysPerYear,
      maxConsecutiveDays,
      requiresApproval = true,
      allowNegativeBalance = false,
      blackoutDates = [],
      status = 'active',
    } = dto;

    const result = await this.pool.query(
      `INSERT INTO leave_type_policies (
        leave_type_id, max_days_per_year, max_consecutive_days,
        requires_approval, allow_negative_balance, blackout_dates, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [leaveTypeId, maxDaysPerYear, maxConsecutiveDays, requiresApproval, allowNegativeBalance, blackoutDates, status]
    );
    return this.mapRowToPolicy(result.rows[0]);
  }

  async update(id: string, dto: Partial<CreateLeavePolicyDto>): Promise<LeavePolicy> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (dto.leaveTypeId !== undefined) {
      fields.push(`leave_type_id = $${paramIndex++}`);
      values.push(dto.leaveTypeId);
    }
    if (dto.maxDaysPerYear !== undefined) {
      fields.push(`max_days_per_year = $${paramIndex++}`);
      values.push(dto.maxDaysPerYear);
    }
    if (dto.maxConsecutiveDays !== undefined) {
      fields.push(`max_consecutive_days = $${paramIndex++}`);
      values.push(dto.maxConsecutiveDays);
    }
    if (dto.requiresApproval !== undefined) {
      fields.push(`requires_approval = $${paramIndex++}`);
      values.push(dto.requiresApproval);
    }
    if (dto.allowNegativeBalance !== undefined) {
      fields.push(`allow_negative_balance = $${paramIndex++}`);
      values.push(dto.allowNegativeBalance);
    }
    if (dto.blackoutDates !== undefined) {
      fields.push(`blackout_dates = $${paramIndex++}`);
      values.push(dto.blackoutDates);
    }
    if (dto.status !== undefined) {
      fields.push(`status = $${paramIndex++}`);
      values.push(dto.status);
    }

    if (fields.length === 0) {
      const existing = await this.findById(id);
      if (!existing) {
        throw new Error(`LeavePolicy with id ${id} not found`);
      }
      return existing;
    }

    values.push(id);
    const result = await this.pool.query(
      `UPDATE leave_type_policies SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    if (!result.rows || result.rows.length === 0) {
      throw new Error(`LeavePolicy with id ${id} not found`);
    }
    return this.mapRowToPolicy(result.rows[0]);
  }

  async archive(id: string): Promise<LeavePolicy> {
    const result = await this.pool.query(
      `UPDATE leave_type_policies SET status = 'archived' WHERE id = $1 RETURNING *`,
      [id]
    );
    if (!result.rows || result.rows.length === 0) {
      throw new Error(`LeavePolicy with id ${id} not found`);
    }
    return this.mapRowToPolicy(result.rows[0]);
  }

  private mapRowToPolicy(row: any): LeavePolicy {
    return {
      id: row.id,
      leaveTypeId: row.leave_type_id,
      maxDaysPerYear: row.max_days_per_year,
      maxConsecutiveDays: row.max_consecutive_days,
      requiresApproval: row.requires_approval,
      allowNegativeBalance: row.allow_negative_balance,
      blackoutDates: row.blackout_dates || [],
      status: row.status,
    };
  }
}
