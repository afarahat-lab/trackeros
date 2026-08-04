import { pool } from '../../shared/db/connection';
import { LeavePolicy } from './policy.model';
import { LeaveType } from '../../shared/types/index';

export interface IPolicyRepository {
  findById(id: string): Promise<LeavePolicy | null>;
  findByLeaveType(leaveType: LeaveType): Promise<LeavePolicy[]>;
  findAllActive(): Promise<LeavePolicy[]>;
  create(policy: CreateLeavePolicyInput): Promise<LeavePolicy>;
  update(id: string, partial: UpdateLeavePolicyInput): Promise<LeavePolicy | null>;
  deactivate(id: string): Promise<boolean>;
}

export interface CreateLeavePolicyInput {
  id: string;
  policyName: string;
  leaveType: LeaveType;
  entitlementDays: number;
  accrualRate: number | null;
  maxAccumulation: number | null;
  minimumNoticeDays: number | null;
  requiresManagerApproval: boolean;
  isActive: boolean;
}

export interface UpdateLeavePolicyInput {
  policyName?: string;
  leaveType?: LeaveType;
  entitlementDays?: number;
  accrualRate?: number | null;
  maxAccumulation?: number | null;
  minimumNoticeDays?: number | null;
  requiresManagerApproval?: boolean;
  isActive?: boolean;
}

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

export class PolicyRepository implements IPolicyRepository {
  async findById(id: string): Promise<LeavePolicy | null> {
    const result = await pool.query(
      'SELECT * FROM leave_policies WHERE id = $1',
      [id],
    );
    if (result.rows.length === 0) {
      return null;
    }
    return mapRowToLeavePolicy(result.rows[0] as LeavePolicyRow);
  }

  async findByLeaveType(leaveType: LeaveType): Promise<LeavePolicy[]> {
    const result = await pool.query(
      'SELECT * FROM leave_policies WHERE leave_type = $1',
      [leaveType],
    );
    return result.rows.map((row: LeavePolicyRow) => mapRowToLeavePolicy(row));
  }

  async findAllActive(): Promise<LeavePolicy[]> {
    const result = await pool.query(
      'SELECT * FROM leave_policies WHERE is_active = true',
    );
    return result.rows.map((row: LeavePolicyRow) => mapRowToLeavePolicy(row));
  }

  async create(policy: CreateLeavePolicyInput): Promise<LeavePolicy> {
    const result = await pool.query(
      `INSERT INTO leave_policies (
        id, policy_name, leave_type, entitlement_days,
        accrual_rate, max_accumulation, minimum_notice_days,
        requires_manager_approval, is_active, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6, $7,
        $8, $9, NOW(), NOW()
      ) RETURNING *`,
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
      ],
    );
    return mapRowToLeavePolicy(result.rows[0] as LeavePolicyRow);
  }

  async update(id: string, partial: UpdateLeavePolicyInput): Promise<LeavePolicy | null> {
    const setters: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    const mutableFields: (keyof UpdateLeavePolicyInput)[] = [
      'policyName',
      'leaveType',
      'entitlementDays',
      'accrualRate',
      'maxAccumulation',
      'minimumNoticeDays',
      'requiresManagerApproval',
      'isActive',
    ];

    for (const field of mutableFields) {
      if (partial[field] !== undefined) {
        const columnName = camelToSnake(field);
        setters.push(`${columnName} = $${paramIndex}`);
        params.push(partial[field]);
        paramIndex++;
      }
    }

    if (setters.length === 0) {
      const existing = await this.findById(id);
      return existing;
    }

    setters.push(`updated_at = NOW()`);
    params.push(id);

    const result = await pool.query(
      `UPDATE leave_policies SET ${setters.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params,
    );

    if (result.rows.length === 0) {
      return null;
    }
    return mapRowToLeavePolicy(result.rows[0] as LeavePolicyRow);
  }

  async deactivate(id: string): Promise<boolean> {
    const result = await pool.query(
      'UPDATE leave_policies SET is_active = false, updated_at = NOW() WHERE id = $1',
      [id],
    );
    return (result.rowCount ?? 0) > 0;
  }
}

function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}
