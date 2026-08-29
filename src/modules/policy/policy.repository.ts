import type { PoolClient } from 'pg';

import { pool } from '../../shared/db/connection';
import { ILeavePolicyRepository, LeavePolicy } from './policy.model';

const COLUMNS = [
  'id',
  'policy_name',
  'leave_type_id',
  'entitlement_days',
  'accrual_rate',
  'max_accumulation',
  'minimum_notice_days',
  'requires_manager_approval',
  'is_active',
  'created_at',
  'updated_at'
] as const;

interface LeavePolicyRow {
  id: string;
  policy_name: string;
  leave_type_id: string;
  entitlement_days: number;
  accrual_rate: number | null;
  max_accumulation: number | null;
  minimum_notice_days: number | null;
  requires_manager_approval: boolean;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

function mapRow(row: LeavePolicyRow): LeavePolicy {
  return {
    id: row.id,
    policyName: row.policy_name,
    leaveTypeId: row.leave_type_id,
    entitlementDays: row.entitlement_days,
    accrualRate: row.accrual_rate,
    maxAccumulation: row.max_accumulation,
    minimumNoticeDays: row.minimum_notice_days,
    requiresManagerApproval: row.requires_manager_approval,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export class PgLeavePolicyRepository implements ILeavePolicyRepository {
  async create(policy: LeavePolicy, client?: PoolClient): Promise<LeavePolicy> {
    const db = client ?? pool;
    const result = await db.query(
      `INSERT INTO leave_policies (
         id, policy_name, leave_type_id, entitlement_days, accrual_rate,
         max_accumulation, minimum_notice_days, requires_manager_approval,
         is_active, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id, policy_name, leave_type_id, entitlement_days, accrual_rate,
         max_accumulation, minimum_notice_days, requires_manager_approval,
         is_active, created_at, updated_at`,
      [
        policy.id,
        policy.policyName,
        policy.leaveTypeId,
        policy.entitlementDays,
        policy.accrualRate,
        policy.maxAccumulation,
        policy.minimumNoticeDays,
        policy.requiresManagerApproval,
        policy.isActive,
        policy.createdAt,
        policy.updatedAt
      ]
    );
    return mapRow(result.rows[0] as LeavePolicyRow);
  }

  async update(policy: LeavePolicy, client?: PoolClient): Promise<LeavePolicy> {
    const db = client ?? pool;
    const result = await db.query(
      `UPDATE leave_policies
       SET policy_name = $2, leave_type_id = $3, entitlement_days = $4,
           accrual_rate = $5, max_accumulation = $6, minimum_notice_days = $7,
           requires_manager_approval = $8, is_active = $9, updated_at = $10
       WHERE id = $1
       RETURNING id, policy_name, leave_type_id, entitlement_days, accrual_rate,
         max_accumulation, minimum_notice_days, requires_manager_approval,
         is_active, created_at, updated_at`,
      [
        policy.id,
        policy.policyName,
        policy.leaveTypeId,
        policy.entitlementDays,
        policy.accrualRate,
        policy.maxAccumulation,
        policy.minimumNoticeDays,
        policy.requiresManagerApproval,
        policy.isActive,
        policy.updatedAt
      ]
    );
    return mapRow(result.rows[0] as LeavePolicyRow);
  }

  async findById(id: string, client?: PoolClient): Promise<LeavePolicy | null> {
    const db = client ?? pool;
    const result = await db.query(
      `SELECT id, policy_name, leave_type_id, entitlement_days, accrual_rate,
         max_accumulation, minimum_notice_days, requires_manager_approval,
         is_active, created_at, updated_at
       FROM leave_policies WHERE id = $1`,
      [id]
    );
    const row = result.rows[0] as LeavePolicyRow | undefined;
    return row ? mapRow(row) : null;
  }

  async findByLeaveTypeId(
    leaveTypeId: string,
    client?: PoolClient
  ): Promise<LeavePolicy[]> {
    const db = client ?? pool;
    const result = await db.query(
      `SELECT id, policy_name, leave_type_id, entitlement_days, accrual_rate,
         max_accumulation, minimum_notice_days, requires_manager_approval,
         is_active, created_at, updated_at
       FROM leave_policies WHERE leave_type_id = $1 ORDER BY policy_name`,
      [leaveTypeId]
    );
    return (result.rows as LeavePolicyRow[]).map(mapRow);
  }

  async findActive(client?: PoolClient): Promise<LeavePolicy[]> {
    const db = client ?? pool;
    const result = await db.query(
      `SELECT id, policy_name, leave_type_id, entitlement_days, accrual_rate,
         max_accumulation, minimum_notice_days, requires_manager_approval,
         is_active, created_at, updated_at
       FROM leave_policies WHERE is_active = true ORDER BY policy_name`
    );
    return (result.rows as LeavePolicyRow[]).map(mapRow);
  }
}
