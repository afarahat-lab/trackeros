import { randomUUID } from 'crypto';
import { pool } from '../../shared/db/connection';
import type { LeavePolicy } from './policy.model';
import type { LeaveType } from '../../shared/types/enums';

interface LeavePolicyRow {
  id: string;
  policy_name: string;
  leave_type: string;
  entitlement_days: number;
  accrual_rate: number | null;
  max_accumulation: number | null;
  minimum_notice_days: number | null;
  requires_manager_approval: boolean;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

function rowToLeavePolicy(row: LeavePolicyRow): LeavePolicy {
  return {
    id: row.id,
    policyName: row.policy_name,
    leaveType: row.leave_type as LeaveType,
    entitlementDays: row.entitlement_days,
    accrualRate: row.accrual_rate,
    maxAccumulation: row.max_accumulation,
    minimumNoticeDays: row.minimum_notice_days,
    requiresManagerApproval: row.requires_manager_approval,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface ILeavePolicyRepository {
  findById(id: string): Promise<LeavePolicy | null>;
  findByLeaveType(leaveType: LeaveType): Promise<LeavePolicy | null>;
  findActive(): Promise<LeavePolicy[]>;
  create(policy: Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeavePolicy>;
  update(id: string, data: Partial<LeavePolicy>): Promise<LeavePolicy | null>;
}

export class PgLeavePolicyRepository implements ILeavePolicyRepository {
  async findById(id: string): Promise<LeavePolicy | null> {
    const result = await pool.query<LeavePolicyRow>(
      'SELECT * FROM leave_policies WHERE id = $1',
      [id],
    );
    if (result.rows.length === 0) {
      return null;
    }
    return rowToLeavePolicy(result.rows[0]);
  }

  async findByLeaveType(leaveType: LeaveType): Promise<LeavePolicy | null> {
    const result = await pool.query<LeavePolicyRow>(
      'SELECT * FROM leave_policies WHERE leave_type = $1',
      [leaveType],
    );
    if (result.rows.length === 0) {
      return null;
    }
    return rowToLeavePolicy(result.rows[0]);
  }

  async findActive(): Promise<LeavePolicy[]> {
    const result = await pool.query<LeavePolicyRow>(
      'SELECT * FROM leave_policies WHERE is_active = $1',
      [true],
    );
    return result.rows.map(rowToLeavePolicy);
  }

  async create(
    policy: Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<LeavePolicy> {
    const id = randomUUID();
    const now = new Date();
    const result = await pool.query<LeavePolicyRow>(
      `INSERT INTO leave_policies (
        id, policy_name, leave_type, entitlement_days,
        accrual_rate, max_accumulation, minimum_notice_days,
        requires_manager_approval, is_active, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        id,
        policy.policyName,
        policy.leaveType,
        policy.entitlementDays,
        policy.accrualRate,
        policy.maxAccumulation,
        policy.minimumNoticeDays,
        policy.requiresManagerApproval,
        policy.isActive,
        now,
        now,
      ],
    );
    return rowToLeavePolicy(result.rows[0]);
  }

  async update(
    id: string,
    data: Partial<LeavePolicy>,
  ): Promise<LeavePolicy | null> {
    const existing = await this.findById(id);
    if (!existing) {
      return null;
    }

    const merged = { ...existing, ...data, id, updatedAt: new Date() };

    const result = await pool.query<LeavePolicyRow>(
      `UPDATE leave_policies SET
        policy_name = $1,
        leave_type = $2,
        entitlement_days = $3,
        accrual_rate = $4,
        max_accumulation = $5,
        minimum_notice_days = $6,
        requires_manager_approval = $7,
        is_active = $8,
        updated_at = $9
      WHERE id = $10
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
        merged.updatedAt,
        id,
      ],
    );

    if (result.rows.length === 0) {
      return null;
    }
    return rowToLeavePolicy(result.rows[0]);
  }
}
