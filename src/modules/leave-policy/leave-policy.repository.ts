import { randomUUID } from 'crypto';
import { BaseRepository } from '../../shared/base-repository';
import { LeavePolicy } from './leave-policy.model';
import { ILeavePolicyRepository } from './leave-policy.repository.interface';
import { LeaveType } from '../../shared/types';

interface LeavePolicyRow {
  [key: string]: unknown;
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
    accrualRate: row.accrual_rate ?? undefined,
    maxAccumulation: row.max_accumulation ?? undefined,
    minimumNoticeDays: row.minimum_notice_days ?? undefined,
    requiresManagerApproval: row.requires_manager_approval,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function isLeavePolicyRow(row: unknown): row is LeavePolicyRow {
  if (typeof row !== 'object' || row === null) return false;
  const r = row as Record<string, unknown>;
  return (
    typeof r.id === 'string' &&
    typeof r.policy_name === 'string' &&
    typeof r.leave_type === 'string' &&
    ['annual', 'sick', 'emergency', 'unpaid', 'maternity', 'paternity'].includes(r.leave_type as string) &&
    typeof r.entitlement_days === 'number' &&
    (r.accrual_rate === null || typeof r.accrual_rate === 'number') &&
    (r.max_accumulation === null || typeof r.max_accumulation === 'number') &&
    (r.minimum_notice_days === null || typeof r.minimum_notice_days === 'number') &&
    typeof r.requires_manager_approval === 'boolean' &&
    typeof r.is_active === 'boolean' &&
    r.created_at instanceof Date &&
    r.updated_at instanceof Date
  );
}

class LeavePolicyBaseRepository extends BaseRepository {}

export class PgLeavePolicyRepository implements ILeavePolicyRepository {
  private readonly base = new LeavePolicyBaseRepository();
  private readonly table = 'leave_policies';

  async findById(id: string): Promise<LeavePolicy | null> {
    const result = await this.base.query<LeavePolicyRow>(
      `SELECT * FROM ${this.table} WHERE id = $1`,
      [id]
    );
    const row = result.rows[0];
    if (!row || !isLeavePolicyRow(row)) return null;
    return rowToLeavePolicy(row);
  }

  async findByLeaveType(leaveType: LeaveType): Promise<LeavePolicy | null> {
    const result = await this.base.query<LeavePolicyRow>(
      `SELECT * FROM ${this.table} WHERE leave_type = $1 AND is_active = true LIMIT 1`,
      [leaveType]
    );
    const row = result.rows[0];
    if (!row || !isLeavePolicyRow(row)) return null;
    return rowToLeavePolicy(row);
  }

  async findAllActive(): Promise<LeavePolicy[]> {
    const result = await this.base.query<LeavePolicyRow>(
      `SELECT * FROM ${this.table} WHERE is_active = true`
    );
    return result.rows.filter(isLeavePolicyRow).map(rowToLeavePolicy);
  }

  async create(
    policy: Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<LeavePolicy> {
    const id = randomUUID();
    const now = new Date();
    const data: Record<string, unknown> = {
      id,
      policy_name: policy.policyName,
      leave_type: policy.leaveType,
      entitlement_days: policy.entitlementDays,
      accrual_rate: policy.accrualRate ?? null,
      max_accumulation: policy.maxAccumulation ?? null,
      minimum_notice_days: policy.minimumNoticeDays ?? null,
      requires_manager_approval: policy.requiresManagerApproval,
      is_active: policy.isActive,
      created_at: now,
      updated_at: now,
    };
    const result = await this.base.query<LeavePolicyRow>(
      `INSERT INTO ${this.table} (id, policy_name, leave_type, entitlement_days, accrual_rate, max_accumulation, minimum_notice_days, requires_manager_approval, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [
        data.id,
        data.policy_name,
        data.leave_type,
        data.entitlement_days,
        data.accrual_rate,
        data.max_accumulation,
        data.minimum_notice_days,
        data.requires_manager_approval,
        data.is_active,
        data.created_at,
        data.updated_at,
      ]
    );
    const row = result.rows[0];
    if (!row || !isLeavePolicyRow(row)) {
      throw new Error('Failed to create leave policy');
    }
    return rowToLeavePolicy(row);
  }

  async update(
    id: string,
    policy: Partial<Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<LeavePolicy | null> {
    const now = new Date();
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (policy.policyName !== undefined) {
      setClauses.push(`policy_name = $${paramIndex++}`);
      values.push(policy.policyName);
    }
    if (policy.leaveType !== undefined) {
      setClauses.push(`leave_type = $${paramIndex++}`);
      values.push(policy.leaveType);
    }
    if (policy.entitlementDays !== undefined) {
      setClauses.push(`entitlement_days = $${paramIndex++}`);
      values.push(policy.entitlementDays);
    }
    if (policy.accrualRate !== undefined) {
      setClauses.push(`accrual_rate = $${paramIndex++}`);
      values.push(policy.accrualRate);
    }
    if (policy.maxAccumulation !== undefined) {
      setClauses.push(`max_accumulation = $${paramIndex++}`);
      values.push(policy.maxAccumulation);
    }
    if (policy.minimumNoticeDays !== undefined) {
      setClauses.push(`minimum_notice_days = $${paramIndex++}`);
      values.push(policy.minimumNoticeDays);
    }
    if (policy.requiresManagerApproval !== undefined) {
      setClauses.push(`requires_manager_approval = $${paramIndex++}`);
      values.push(policy.requiresManagerApproval);
    }
    if (policy.isActive !== undefined) {
      setClauses.push(`is_active = $${paramIndex++}`);
      values.push(policy.isActive);
    }

    if (setClauses.length === 0) {
      return this.findById(id);
    }

    setClauses.push(`updated_at = $${paramIndex++}`);
    values.push(now);
    values.push(id);

    const result = await this.base.query<LeavePolicyRow>(
      `UPDATE ${this.table} SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    const row = result.rows[0];
    if (!row || !isLeavePolicyRow(row)) return null;
    return rowToLeavePolicy(row);
  }

  async deactivate(id: string): Promise<boolean> {
    const now = new Date();
    const result = await this.base.query(
      `UPDATE ${this.table} SET is_active = $1, updated_at = $2 WHERE id = $3`,
      [false, now, id]
    );
    return (result.rowCount ?? 0) > 0;
  }
}
