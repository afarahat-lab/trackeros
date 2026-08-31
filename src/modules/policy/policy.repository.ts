import { PoolClient } from 'pg';
import { pool } from '../../shared/db/connection';
import { LeaveType } from '../../shared/types';
import { ILeavePolicyRepository, LeavePolicy } from './policy.model';

interface PolicyRow {
  id: string;
  policy_name: string;
  leave_type: LeaveType;
  entitlement_days: number;
  accrual_rate: number | null;
  max_accumulation: number | null;
  minimum_notice_days: number | null;
  requires_manager_approval: boolean;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

function toPolicy(row: PolicyRow): LeavePolicy {
  return {
    id: row.id,
    policyName: row.policy_name,
    leaveType: row.leave_type,
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

export class PgLeavePolicyRepository implements ILeavePolicyRepository {
  async create(policy: LeavePolicy, client?: PoolClient): Promise<LeavePolicy> {
    const db = client ?? pool;
    const result = await db.query<PolicyRow>(
      `INSERT INTO leave_policies (
         id, policy_name, leave_type, entitlement_days, accrual_rate,
         max_accumulation, minimum_notice_days, requires_manager_approval,
         is_active, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        policy.id,
        policy.policyName,
        policy.leaveType,
        policy.entitlementDays,
        policy.accrualRate ?? null,
        policy.maxAccumulation ?? null,
        policy.minimumNoticeDays ?? null,
        policy.requiresManagerApproval,
        policy.isActive,
        policy.createdAt,
        policy.updatedAt,
      ],
    );
    return toPolicy(result.rows[0]);
  }

  async list(client?: PoolClient): Promise<LeavePolicy[]> {
    const db = client ?? pool;
    const result = await db.query<PolicyRow>(
      `SELECT * FROM leave_policies WHERE deleted_at IS NULL ORDER BY created_at ASC`,
    );
    return result.rows.map(toPolicy);
  }

  async findById(id: string, client?: PoolClient): Promise<LeavePolicy | null> {
    const db = client ?? pool;
    const result = await db.query<PolicyRow>(
      `SELECT * FROM leave_policies WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    );
    return result.rows[0] ? toPolicy(result.rows[0]) : null;
  }

  async findByLeaveType(
    leaveType: LeaveType,
    client?: PoolClient,
  ): Promise<LeavePolicy | null> {
    const db = client ?? pool;
    const result = await db.query<PolicyRow>(
      `SELECT * FROM leave_policies WHERE leave_type = $1 AND deleted_at IS NULL`,
      [leaveType],
    );
    return result.rows[0] ? toPolicy(result.rows[0]) : null;
  }

  async findActiveByLeaveType(
    leaveType: LeaveType,
    client?: PoolClient,
  ): Promise<LeavePolicy | null> {
    const db = client ?? pool;
    const result = await db.query<PolicyRow>(
      `SELECT * FROM leave_policies
       WHERE leave_type = $1 AND is_active = true AND deleted_at IS NULL`,
      [leaveType],
    );
    return result.rows[0] ? toPolicy(result.rows[0]) : null;
  }

  async update(
    id: string,
    changes: Partial<LeavePolicy>,
    client?: PoolClient,
  ): Promise<LeavePolicy | null> {
    const columnMap: Partial<Record<keyof LeavePolicy, string>> = {
      policyName: 'policy_name',
      leaveType: 'leave_type',
      entitlementDays: 'entitlement_days',
      accrualRate: 'accrual_rate',
      maxAccumulation: 'max_accumulation',
      minimumNoticeDays: 'minimum_notice_days',
      requiresManagerApproval: 'requires_manager_approval',
      isActive: 'is_active',
    };

    const entries = (Object.entries(changes) as [keyof LeavePolicy, unknown][]).filter(
      ([key]) => key !== 'id' && columnMap[key] !== undefined,
    );

    if (entries.length === 0) {
      return this.findById(id, client);
    }

    const db = client ?? pool;
    const setClause = entries
      .map(([key], index) => `${columnMap[key]} = $${index + 1}`)
      .join(', ');
    const values = entries.map(([, value]) => value);

    const result = await db.query<PolicyRow>(
      `UPDATE leave_policies
       SET ${setClause}, updated_at = NOW()
       WHERE id = $${entries.length + 1} AND deleted_at IS NULL
       RETURNING *`,
      [...values, id],
    );
    return result.rows[0] ? toPolicy(result.rows[0]) : null;
  }
}
