import { pool } from '../../shared/db/connection';
import { LeavePolicy, IPolicyRepository } from './policy.model';

export class PolicyRepository implements IPolicyRepository {
  async findById(id: string): Promise<LeavePolicy | null> {
    const result = await pool.query('SELECT * FROM leave_policies WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return null;
    }
    return this.mapRow(result.rows[0]);
  }

  async findByLeaveType(leaveType: LeavePolicy['leaveType']): Promise<LeavePolicy[]> {
    const result = await pool.query(
      'SELECT * FROM leave_policies WHERE leave_type = $1',
      [leaveType],
    );
    return result.rows.map((row: Record<string, unknown>) => this.mapRow(row));
  }

  async findActive(): Promise<LeavePolicy[]> {
    const result = await pool.query(
      'SELECT * FROM leave_policies WHERE is_active = true',
    );
    return result.rows.map((row: Record<string, unknown>) => this.mapRow(row));
  }

  async create(
    policy: Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<LeavePolicy> {
    const result = await pool.query(
      `INSERT INTO leave_policies (policy_name, leave_type, entitlement_days, accrual_rate, max_accumulation, minimum_notice_days, requires_manager_approval, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        policy.policyName,
        policy.leaveType,
        policy.entitlementDays,
        policy.accrualRate,
        policy.maxAccumulation,
        policy.minimumNoticeDays,
        policy.requiresManagerApproval,
        policy.isActive,
      ],
    );
    return this.mapRow(result.rows[0]);
  }

  async update(id: string, data: Partial<LeavePolicy>): Promise<LeavePolicy | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    const fieldMap: Array<{ key: keyof LeavePolicy; column: string }> = [
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
      if (data[key] !== undefined) {
        fields.push(`${column} = $${paramIndex}`);
        values.push(data[key]);
        paramIndex++;
      }
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await pool.query(
      `UPDATE leave_policies SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values,
    );

    if (result.rows.length === 0) {
      return null;
    }
    return this.mapRow(result.rows[0]);
  }

  private mapRow(row: Record<string, unknown>): LeavePolicy {
    return {
      id: row.id as string,
      policyName: row.policy_name as string,
      leaveType: row.leave_type as LeavePolicy['leaveType'],
      entitlementDays: row.entitlement_days as number,
      accrualRate: row.accrual_rate as number | null,
      maxAccumulation: row.max_accumulation as number | null,
      minimumNoticeDays: row.minimum_notice_days as number | null,
      requiresManagerApproval: row.requires_manager_approval as boolean,
      isActive: row.is_active as boolean,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }
}
