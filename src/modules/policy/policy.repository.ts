import { pool } from '../../shared/db/connection';
import { LeavePolicy, CreateLeavePolicyDto, UpdateLeavePolicyDto } from './policy.model';
import { LeaveType } from '../../shared/types';

export interface IPolicyRepository {
  findByLeaveType(leaveType: LeaveType): Promise<LeavePolicy | null>;
  findById(id: number): Promise<LeavePolicy | null>;
  findAll(): Promise<LeavePolicy[]>;
  create(dto: CreateLeavePolicyDto): Promise<LeavePolicy>;
  update(id: number, dto: UpdateLeavePolicyDto): Promise<LeavePolicy | null>;
  softDelete(id: number): Promise<boolean>;
}

export class PolicyRepository implements IPolicyRepository {
  async findByLeaveType(leaveType: LeaveType): Promise<LeavePolicy | null> {
    const result = await pool.query(
      'SELECT * FROM leave_policies WHERE leave_type = $1 AND is_active = true',
      [leaveType]
    );
    if (result.rows.length === 0) {
      return null;
    }
    return this.mapRow(result.rows[0]);
  }

  async findById(id: number): Promise<LeavePolicy | null> {
    const result = await pool.query(
      'SELECT * FROM leave_policies WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) {
      return null;
    }
    return this.mapRow(result.rows[0]);
  }

  async findAll(): Promise<LeavePolicy[]> {
    const result = await pool.query('SELECT * FROM leave_policies ORDER BY id');
    return result.rows.map((row: Record<string, unknown>) => this.mapRow(row));
  }

  async create(dto: CreateLeavePolicyDto): Promise<LeavePolicy> {
    const result = await pool.query(
      `INSERT INTO leave_policies (
        policy_name, leave_type, entitlement_days, accrual_rate,
        max_accumulation, minimum_notice_days, requires_manager_approval, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        dto.policyName,
        dto.leaveType,
        dto.entitlementDays,
        dto.accrualRate ?? null,
        dto.maxAccumulation ?? null,
        dto.minimumNoticeDays ?? null,
        dto.requiresManagerApproval,
        dto.isActive,
      ]
    );
    return this.mapRow(result.rows[0]);
  }

  async update(id: number, dto: UpdateLeavePolicyDto): Promise<LeavePolicy | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    const fieldMap: Array<{ key: keyof UpdateLeavePolicyDto; column: string }> = [
      { key: 'policyName', column: 'policy_name' },
      { key: 'leaveType', column: 'leave_type' },
      { key: 'entitlementDays', column: 'entitlement_days' },
      { key: 'accrualRate', column: 'accrual_rate' },
      { key: 'maxAccumulation', column: 'max_accumulation' },
      { key: 'minimumNoticeDays', column: 'minimum_notice_days' },
      { key: 'requiresManagerApproval', column: 'requires_manager_approval' },
      { key: 'isActive', column: 'is_active' },
    ];

    for (const { key, column } of fieldMap) {
      if (dto[key] !== undefined) {
        fields.push(`${column} = $${paramIndex}`);
        values.push(dto[key]);
        paramIndex++;
      }
    }

    if (fields.length === 0) {
      const existing = await this.findById(id);
      return existing;
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await pool.query(
      `UPDATE leave_policies SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return null;
    }
    return this.mapRow(result.rows[0]);
  }

  async softDelete(id: number): Promise<boolean> {
    const result = await pool.query(
      'UPDATE leave_policies SET is_active = false, updated_at = NOW() WHERE id = $1',
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  }

  private mapRow(row: Record<string, unknown>): LeavePolicy {
    return {
      id: row.id as number,
      policyName: row.policy_name as string,
      leaveType: row.leave_type as LeaveType,
      entitlementDays: row.entitlement_days as number,
      accrualRate: row.accrual_rate as number | undefined,
      maxAccumulation: row.max_accumulation as number | undefined,
      minimumNoticeDays: row.minimum_notice_days as number | undefined,
      requiresManagerApproval: row.requires_manager_approval as boolean,
      isActive: row.is_active as boolean,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
    };
  }
}
