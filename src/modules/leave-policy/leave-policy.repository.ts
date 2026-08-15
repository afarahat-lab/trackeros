import knex, { Knex } from 'knex';
import { pool } from '../../shared/db/connection';
import { LeavePolicy } from './leave-policy.model';
import { LeaveType } from '../../shared/types';

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

function toLeavePolicy(row: LeavePolicyRow): LeavePolicy {
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
  findAllActive(): Promise<LeavePolicy[]>;
  findAll(): Promise<LeavePolicy[]>;
  create(policy: Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeavePolicy>;
  update(id: string, data: Partial<LeavePolicy>): Promise<LeavePolicy | null>;
}

export class LeavePolicyRepository implements ILeavePolicyRepository {
  private readonly db: Knex;

  constructor() {
    this.db = knex({ client: 'pg', pool: pool as unknown as Knex.Config['pool'] });
  }

  async findById(id: string): Promise<LeavePolicy | null> {
    const result = await this.db.raw<{ rows: LeavePolicyRow[] }>(
      'SELECT * FROM leave_policies WHERE id = ?',
      [id],
    );
    return result.rows[0] ? toLeavePolicy(result.rows[0]) : null;
  }

  async findByLeaveType(leaveType: LeaveType): Promise<LeavePolicy | null> {
    const result = await this.db.raw<{ rows: LeavePolicyRow[] }>(
      'SELECT * FROM leave_policies WHERE leave_type = ?',
      [leaveType],
    );
    return result.rows[0] ? toLeavePolicy(result.rows[0]) : null;
  }

  async findAllActive(): Promise<LeavePolicy[]> {
    const result = await this.db.raw<{ rows: LeavePolicyRow[] }>(
      'SELECT * FROM leave_policies WHERE is_active = true',
    );
    return result.rows.map(toLeavePolicy);
  }

  async findAll(): Promise<LeavePolicy[]> {
    const result = await this.db.raw<{ rows: LeavePolicyRow[] }>(
      'SELECT * FROM leave_policies',
    );
    return result.rows.map(toLeavePolicy);
  }

  async create(
    policy: Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<LeavePolicy> {
    const now = new Date();
    const result = await this.db.raw<{ rows: LeavePolicyRow[] }>(
      `INSERT INTO leave_policies (
        policy_name, leave_type, entitlement_days, accrual_rate,
        max_accumulation, minimum_notice_days, requires_manager_approval,
        is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        now,
        now,
      ],
    );
    return toLeavePolicy(result.rows[0]);
  }

  async update(id: string, data: Partial<LeavePolicy>): Promise<LeavePolicy | null> {
    const existing = await this.findById(id);
    if (!existing) {
      return null;
    }

    const now = new Date();
    const fields: string[] = [];
    const values: (string | number | boolean | Date | null)[] = [];

    const columnMap: Record<string, string> = {
      policyName: 'policy_name',
      leaveType: 'leave_type',
      entitlementDays: 'entitlement_days',
      accrualRate: 'accrual_rate',
      maxAccumulation: 'max_accumulation',
      minimumNoticeDays: 'minimum_notice_days',
      requiresManagerApproval: 'requires_manager_approval',
      isActive: 'is_active',
    };

    for (const [key, col] of Object.entries(columnMap)) {
      if (key in data) {
        fields.push(`${col} = ?`);
        const val = (data as Record<string, unknown>)[key];
        if (val !== undefined) {
          values.push(val as string | number | boolean | Date | null);
        }
      }
    }

    if (fields.length === 0) {
      return existing;
    }

    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    const result = await this.db.raw<{ rows: LeavePolicyRow[] }>(
      `UPDATE leave_policies SET ${fields.join(', ')} WHERE id = ? RETURNING *`,
      values,
    );
    return result.rows[0] ? toLeavePolicy(result.rows[0]) : null;
  }
}
