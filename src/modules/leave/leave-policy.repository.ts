
import { Pool } from 'pg';
import { BaseRepository } from '../../shared/base-repository';
import { LeavePolicy } from './leave-policy.model';
import { LeaveType } from '../../shared/types/index';

export interface ILeavePolicyRepository {
  findById(id: string): Promise<LeavePolicy | null>;
  findAll(): Promise<LeavePolicy[]>;
  findByLeaveType(leaveType: LeaveType): Promise<LeavePolicy[]>;
  create(policy: Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeavePolicy>;
  update(id: string, policy: Partial<Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>>): Promise<LeavePolicy | null>;
  softDelete(id: string): Promise<boolean>;
}

export class LeavePolicyRepository extends BaseRepository<LeavePolicy> implements ILeavePolicyRepository {
  constructor(poolOverride?: Pool) {
    super(poolOverride);
  }

  async findById(id: string): Promise<LeavePolicy | null> {
    const result = await this.query(
      'SELECT * FROM leave_policy WHERE id = $1 AND deleted_at IS NULL',
      [id],
    );
    return result.rows[0] ?? null;
  }

  async findAll(): Promise<LeavePolicy[]> {
    const result = await this.query(
      'SELECT * FROM leave_policy WHERE deleted_at IS NULL ORDER BY policy_name ASC',
    );
    return result.rows;
  }

  async findByLeaveType(leaveType: LeaveType): Promise<LeavePolicy[]> {
    const result = await this.query(
      'SELECT * FROM leave_policy WHERE leave_type = $1 AND deleted_at IS NULL ORDER BY policy_name ASC',
      [leaveType],
    );
    return result.rows;
  }

  async create(policy: Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeavePolicy> {
    const result = await this.query(
      `INSERT INTO leave_policy (
        policy_name, leave_type, entitlement_days, accrual_rate,
        max_accumulation, minimum_notice_days, requires_manager_approval,
        is_active, allows_negative_balance, max_consecutive_days
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
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
        policy.allowsNegativeBalance,
        policy.maxConsecutiveDays,
      ],
    );
    return result.rows[0];
  }

  async update(
    id: string,
    policy: Partial<Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<LeavePolicy | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    const fieldMap: Array<[keyof typeof policy, string]> = [
      ['policyName', 'policy_name'],
      ['leaveType', 'leave_type'],
      ['entitlementDays', 'entitlement_days'],
      ['accrualRate', 'accrual_rate'],
      ['maxAccumulation', 'max_accumulation'],
      ['minimumNoticeDays', 'minimum_notice_days'],
      ['requiresManagerApproval', 'requires_manager_approval'],
      ['isActive', 'is_active'],
      ['allowsNegativeBalance', 'allows_negative_balance'],
      ['maxConsecutiveDays', 'max_consecutive_days'],
    ];

    for (const [key, column] of fieldMap) {
      if (policy[key] !== undefined) {
        fields.push(`${column} = $${paramIndex}`);
        values.push(policy[key]);
        paramIndex++;
      }
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await this.query(
      `UPDATE leave_policy SET ${fields.join(', ')} WHERE id = $${paramIndex} AND deleted_at IS NULL RETURNING *`,
      values,
    );
    return result.rows[0] ?? null;
  }

  async softDelete(id: string): Promise<boolean> {
    const result = await this.query(
      'UPDATE leave_policy SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL',
      [id],
    );
    return (result.rowCount ?? 0) > 0;
  }
}
