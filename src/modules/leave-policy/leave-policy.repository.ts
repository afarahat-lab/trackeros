import { pool } from '../../shared/db/connection';
import { LeaveType } from '../../shared/types';
import { LeavePolicy, ILeavePolicyRepository } from './leave-policy.model';

interface LeavePolicyRow {
  id: string;
  policy_name: string;
  leave_type: string;
  entitlement_days: number;
  accrual_rate: number | undefined;
  max_accumulation: number | undefined;
  minimum_notice_days: number;
  requires_manager_approval: boolean;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

function mapRowToLeavePolicy(row: LeavePolicyRow): LeavePolicy {
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

const COLUMN_MAP: Record<string, string> = {
  policyName: 'policy_name',
  leaveType: 'leave_type',
  entitlementDays: 'entitlement_days',
  accrualRate: 'accrual_rate',
  maxAccumulation: 'max_accumulation',
  minimumNoticeDays: 'minimum_notice_days',
  requiresManagerApproval: 'requires_manager_approval',
  isActive: 'is_active',
};

export class PgLeavePolicyRepository implements ILeavePolicyRepository {
  async findById(id: string): Promise<LeavePolicy | null> {
    const result = await pool.query<LeavePolicyRow>(
      'SELECT * FROM leave_policies WHERE id = $1',
      [id],
    );
    if (result.rows.length === 0) {
      return null;
    }
    return mapRowToLeavePolicy(result.rows[0]);
  }

  async findByLeaveType(leaveType: LeaveType): Promise<LeavePolicy | null> {
    const result = await pool.query<LeavePolicyRow>(
      'SELECT * FROM leave_policies WHERE leave_type = $1',
      [leaveType],
    );
    if (result.rows.length === 0) {
      return null;
    }
    return mapRowToLeavePolicy(result.rows[0]);
  }

  async findAllActive(): Promise<LeavePolicy[]> {
    const result = await pool.query<LeavePolicyRow>(
      'SELECT * FROM leave_policies WHERE is_active = true',
    );
    return result.rows.map(mapRowToLeavePolicy);
  }

  async create(
    policy: Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<LeavePolicy> {
    const result = await pool.query<LeavePolicyRow>(
      `INSERT INTO leave_policies (
        policy_name, leave_type, entitlement_days,
        accrual_rate, max_accumulation, minimum_notice_days,
        requires_manager_approval, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
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
    return mapRowToLeavePolicy(result.rows[0]);
  }

  async update(
    id: string,
    data: Partial<LeavePolicy>,
  ): Promise<LeavePolicy | null> {
    const keys = Object.keys(data).filter(
      (k) =>
        data[k as keyof typeof data] !== undefined &&
        COLUMN_MAP[k] !== undefined,
    );

    if (keys.length === 0) {
      const existing = await this.findById(id);
      return existing;
    }

    const setClauses = keys.map(
      (key, index) => `${COLUMN_MAP[key]} = $${index + 2}`,
    );
    const values = keys.map((key) => data[key as keyof typeof data]);

    const result = await pool.query<LeavePolicyRow>(
      `UPDATE leave_policies SET ${setClauses.join(', ')}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, ...values],
    );

    if (result.rows.length === 0) {
      return null;
    }
    return mapRowToLeavePolicy(result.rows[0]);
  }
}
