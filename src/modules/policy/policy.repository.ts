import { pool } from '../../shared/db/connection';
import { LeavePolicy } from './policy.model';
import { LeaveType } from '../../shared/types';

interface PolicyRow {
  id: string;
  policy_name: string;
  leave_type: string;
  entitlement_days: number;
  accrual_rate: number | null;
  max_accumulation: number | null;
  minimum_notice_days: number;
  requires_manager_approval: boolean;
  is_active: boolean;
  is_paid: boolean;
  created_at: Date;
  updated_at: Date;
}

function rowToPolicy(row: PolicyRow): LeavePolicy {
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
    isPaid: row.is_paid,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface ILeavePolicyRepository {
  findById(id: string): Promise<LeavePolicy | null>;
  findByLeaveType(leaveType: LeaveType): Promise<LeavePolicy | null>;
  findAllActive(): Promise<LeavePolicy[]>;
  create(policy: Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeavePolicy>;
}

export class LeavePolicyRepository implements ILeavePolicyRepository {
  async findById(id: string): Promise<LeavePolicy | null> {
    const result = await pool.query<PolicyRow>(
      'SELECT * FROM leave_policies WHERE id = $1',
      [id],
    );

    if (result.rows.length === 0) {
      return null;
    }

    return rowToPolicy(result.rows[0]);
  }

  async findByLeaveType(leaveType: LeaveType): Promise<LeavePolicy | null> {
    const result = await pool.query<PolicyRow>(
      'SELECT * FROM leave_policies WHERE leave_type = $1',
      [leaveType],
    );

    if (result.rows.length === 0) {
      return null;
    }

    return rowToPolicy(result.rows[0]);
  }

  async findAllActive(): Promise<LeavePolicy[]> {
    const result = await pool.query<PolicyRow>(
      'SELECT * FROM leave_policies WHERE is_active = true',
    );

    return result.rows.map(rowToPolicy);
  }

  async create(policy: Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeavePolicy> {
    const id = crypto.randomUUID();
    const now = new Date();

    await pool.query(
      `INSERT INTO leave_policies (
        id, policy_name, leave_type, entitlement_days, accrual_rate,
        max_accumulation, minimum_notice_days, requires_manager_approval,
        is_active, is_paid, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
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
        policy.isPaid,
        now,
        now,
      ],
    );

    const result = await pool.query<PolicyRow>(
      'SELECT * FROM leave_policies WHERE id = $1',
      [id],
    );

    return rowToPolicy(result.rows[0]);
  }
}
