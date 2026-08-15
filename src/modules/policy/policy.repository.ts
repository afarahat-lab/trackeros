import { Pool, PoolClient } from 'pg';
import { pool } from '../../shared/db/connection';
import { LeavePolicy } from './policy.model';
import { LeaveType } from '../../shared/types/leave-type.enum';

export interface IPolicyRepository {
  findById(id: string): Promise<LeavePolicy | null>;
  findByLeaveType(leaveType: LeaveType): Promise<LeavePolicy | null>;
  findAllActive(): Promise<LeavePolicy[]>;
  create(policy: Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeavePolicy>;
  update(id: string, data: Partial<LeavePolicy>): Promise<LeavePolicy | null>;
}

function rowToPolicy(row: Record<string, unknown>): LeavePolicy {
  return {
    id: row.id as string,
    policyName: row.policy_name as string,
    leaveType: row.leave_type as LeaveType,
    entitlementDays: Number(row.entitlement_days),
    accrualRate: row.accrual_rate != null ? Number(row.accrual_rate) : null,
    maxAccumulation: row.max_accumulation != null ? Number(row.max_accumulation) : null,
    minimumNoticeDays: row.minimum_notice_days != null ? Number(row.minimum_notice_days) : null,
    requiresManagerApproval: Boolean(row.requires_manager_approval),
    isActive: Boolean(row.is_active),
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };
}

export class PolicyRepository implements IPolicyRepository {
  private readonly db: Pool | PoolClient;

  constructor(client?: Pool | PoolClient) {
    this.db = client ?? pool;
  }

  async findById(id: string): Promise<LeavePolicy | null> {
    const result = await this.db.query(
      'SELECT * FROM leave_policies WHERE id = $1',
      [id],
    );
    if (result.rows.length === 0) {
      return null;
    }
    return rowToPolicy(result.rows[0]);
  }

  async findByLeaveType(leaveType: LeaveType): Promise<LeavePolicy | null> {
    const result = await this.db.query(
      'SELECT * FROM leave_policies WHERE leave_type = $1',
      [leaveType],
    );
    if (result.rows.length === 0) {
      return null;
    }
    return rowToPolicy(result.rows[0]);
  }

  async findAllActive(): Promise<LeavePolicy[]> {
    const result = await this.db.query(
      'SELECT * FROM leave_policies WHERE is_active = true ORDER BY policy_name',
    );
    return result.rows.map(rowToPolicy);
  }

  async create(
    policy: Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<LeavePolicy> {
    const now = new Date();
    const result = await this.db.query(
      `INSERT INTO leave_policies (
        policy_name, leave_type, entitlement_days, accrual_rate,
        max_accumulation, minimum_notice_days, requires_manager_approval,
        is_active, created_at, updated_at
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
        now,
        now,
      ],
    );
    return rowToPolicy(result.rows[0]);
  }

  async update(id: string, data: Partial<LeavePolicy>): Promise<LeavePolicy | null> {
    const existing = await this.findById(id);
    if (!existing) {
      return null;
    }

    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    const fieldMap: Array<{ key: keyof LeavePolicy; column: string }> = [
      { key: 'policyName', column: 'policy_name' },
      { key: 'entitlementDays', column: 'entitlement_days' },
      { key: 'accrualRate', column: 'accrual_rate' },
      { key: 'maxAccumulation', column: 'max_accumulation' },
      { key: 'minimumNoticeDays', column: 'minimum_notice_days' },
      { key: 'requiresManagerApproval', column: 'requires_manager_approval' },
      { key: 'isActive', column: 'is_active' },
    ];

    for (const { key, column } of fieldMap) {
      if (key in data) {
        fields.push(`${column} = $${paramIndex}`);
        values.push(data[key]);
        paramIndex++;
      }
    }

    if (fields.length === 0) {
      return existing;
    }

    fields.push(`updated_at = $${paramIndex}`);
    values.push(new Date());
    paramIndex++;

    values.push(id);

    const result = await this.db.query(
      `UPDATE leave_policies SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values,
    );

    if (result.rows.length === 0) {
      return null;
    }
    return rowToPolicy(result.rows[0]);
  }
}
