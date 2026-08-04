import { pool } from '../../shared/db/connection';
import { LeavePolicy } from './leave-policy.model';
import { LeaveType } from '../../shared/types/leave-type.enum';

export interface ILeavePolicyRepository {
  findById(id: string): Promise<LeavePolicy | null>;
  findByLeaveType(leaveType: LeaveType): Promise<LeavePolicy[]>;
  findActive(): Promise<LeavePolicy[]>;
  findAll(): Promise<LeavePolicy[]>;
  save(policy: LeavePolicy): Promise<LeavePolicy>;
  update(id: string, partial: Partial<LeavePolicy>): Promise<LeavePolicy | null>;
}

export class PgLeavePolicyRepository implements ILeavePolicyRepository {
  async findById(id: string): Promise<LeavePolicy | null> {
    const result = await pool.query(
      'SELECT * FROM leave_policies WHERE id = $1',
      [id]
    );
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  async findByLeaveType(leaveType: LeaveType): Promise<LeavePolicy[]> {
    const result = await pool.query(
      'SELECT * FROM leave_policies WHERE leave_type = $1',
      [leaveType]
    );
    return result.rows.map((row: Record<string, unknown>) => this.mapRow(row));
  }

  async findActive(): Promise<LeavePolicy[]> {
    const result = await pool.query(
      'SELECT * FROM leave_policies WHERE is_active = true'
    );
    return result.rows.map((row: Record<string, unknown>) => this.mapRow(row));
  }

  async findAll(): Promise<LeavePolicy[]> {
    const result = await pool.query('SELECT * FROM leave_policies');
    return result.rows.map((row: Record<string, unknown>) => this.mapRow(row));
  }

  async save(policy: LeavePolicy): Promise<LeavePolicy> {
    const result = await pool.query(
      `INSERT INTO leave_policies (id, policy_name, leave_type, entitlement_days, accrual_rate, max_accumulation, minimum_notice_days, requires_manager_approval, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        policy.id,
        policy.policyName,
        policy.leaveType,
        policy.entitlementDays,
        policy.accrualRate,
        policy.maxAccumulation,
        policy.minimumNoticeDays,
        policy.requiresManagerApproval,
        policy.isActive,
        policy.createdAt,
        policy.updatedAt,
      ]
    );
    return this.mapRow(result.rows[0]);
  }

  async update(id: string, partial: Partial<LeavePolicy>): Promise<LeavePolicy | null> {
    const existing = await this.findById(id);
    if (!existing) {
      return null;
    }

    const merged = { ...existing, ...partial, id, updatedAt: new Date() };
    const result = await pool.query(
      `UPDATE leave_policies SET
        policy_name = $1, leave_type = $2, entitlement_days = $3,
        accrual_rate = $4, max_accumulation = $5, minimum_notice_days = $6,
        requires_manager_approval = $7, is_active = $8, created_at = $9, updated_at = $10
       WHERE id = $11
       RETURNING *`,
      [
        merged.policyName,
        merged.leaveType,
        merged.entitlementDays,
        merged.accrualRate,
        merged.maxAccumulation,
        merged.minimumNoticeDays,
        merged.requiresManagerApproval,
        merged.isActive,
        merged.createdAt,
        merged.updatedAt,
        id,
      ]
    );
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  private mapRow(row: Record<string, unknown>): LeavePolicy {
    return {
      id: row.id as string,
      policyName: row.policy_name as string,
      leaveType: row.leave_type as LeaveType,
      entitlementDays: row.entitlement_days as number,
      accrualRate: row.accrual_rate as number | null,
      maxAccumulation: row.max_accumulation as number | null,
      minimumNoticeDays: row.minimum_notice_days as number | null,
      requiresManagerApproval: row.requires_manager_approval as boolean,
      isActive: row.is_active as boolean,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
    };
  }
}
