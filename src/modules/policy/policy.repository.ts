import { pool } from 'shared/db/connection';
import {
  LeavePolicy,
  IPolicyRepository,
  DuplicateLeaveTypeError,
} from './policy.model';
import { LeaveType } from 'shared/types/leave.types';

type DbRow = Record<string, unknown>;

export class PolicyRepository implements IPolicyRepository {
  async findById(id: string): Promise<LeavePolicy | null> {
    const result = await pool.query(
      'SELECT * FROM leave_policies WHERE id = $1',
      [id]
    );
    const rows = result.rows as DbRow[];
    if (rows.length === 0) return null;
    return this.mapRow(rows[0]);
  }

  async findByLeaveType(leaveType: LeaveType): Promise<LeavePolicy | null> {
    const result = await pool.query(
      'SELECT * FROM leave_policies WHERE leave_type = $1',
      [leaveType]
    );
    const rows = result.rows as DbRow[];
    if (rows.length === 0) return null;
    return this.mapRow(rows[0]);
  }

  async findAllActive(): Promise<LeavePolicy[]> {
    const result = await pool.query(
      'SELECT * FROM leave_policies WHERE is_active = true'
    );
    const rows = result.rows as DbRow[];
    return rows.map((row) => this.mapRow(row));
  }

  async create(
    policy: Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<LeavePolicy> {
    const existing = await this.findByLeaveType(policy.leaveType);
    if (existing) {
      throw new DuplicateLeaveTypeError(policy.leaveType);
    }

    const result = await pool.query(
      `INSERT INTO leave_policies (
        policy_name, leave_type, entitlement_days, accrual_rate,
        max_accumulation, minimum_notice_days, requires_manager_approval,
        is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        policy.policyName,
        policy.leaveType,
        policy.entitlementDays,
        policy.accrualRate ?? null,
        policy.maxAccumulation ?? null,
        policy.minimumNoticeDays ?? null,
        policy.requiresManagerApproval,
        policy.isActive,
      ]
    );
    const rows = result.rows as DbRow[];
    return this.mapRow(rows[0]);
  }

  async update(
    id: string,
    data: Partial<LeavePolicy>
  ): Promise<LeavePolicy | null> {
    const clauses: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    const fieldMap: Array<[string, keyof LeavePolicy]> = [
      ['policy_name', 'policyName'],
      ['leave_type', 'leaveType'],
      ['entitlement_days', 'entitlementDays'],
      ['accrual_rate', 'accrualRate'],
      ['max_accumulation', 'maxAccumulation'],
      ['minimum_notice_days', 'minimumNoticeDays'],
      ['requires_manager_approval', 'requiresManagerApproval'],
      ['is_active', 'isActive'],
    ];

    for (const [col, key] of fieldMap) {
      if (key in data) {
        clauses.push(`${col} = $${idx}`);
        const val = data[key as keyof Partial<LeavePolicy>];
        values.push(val ?? null);
        idx++;
      }
    }

    if (clauses.length === 0) {
      return this.findById(id);
    }

    clauses.push(`updated_at = NOW()`);

    values.push(id);
    const result = await pool.query(
      `UPDATE leave_policies SET ${clauses.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );

    const rows = result.rows as DbRow[];
    if (rows.length === 0) return null;
    return this.mapRow(rows[0]);
  }

  private mapRow(row: DbRow): LeavePolicy {
    return {
      id: row.id as string,
      policyName: row.policy_name as string,
      leaveType: row.leave_type as LeaveType,
      entitlementDays: row.entitlement_days as number,
      accrualRate: row.accrual_rate as number | undefined,
      maxAccumulation: row.max_accumulation as number | undefined,
      minimumNoticeDays: row.minimum_notice_days as number | undefined,
      requiresManagerApproval: row.requires_manager_approval as boolean,
      isActive: row.is_active as boolean,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
    };
  }
}
