
import { Pool } from 'pg';
import { pool } from '../../shared/db/connection';
import { LeavePolicy, LeavePolicyQueryParams } from './policy.model';
import { LeaveType } from '../../shared/types/leave.types';

export interface ILeavePolicyRepository {
  findById(id: number): Promise<LeavePolicy | null>;
  findByLeaveType(leaveType: LeaveType): Promise<LeavePolicy[]>;
  findActivePolicies(params?: LeavePolicyQueryParams): Promise<LeavePolicy[]>;
  create(policy: Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeavePolicy>;
  update(id: number, policy: Partial<Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>>): Promise<LeavePolicy | null>;
  delete(id: number): Promise<boolean>;
}

export class LeavePolicyRepository implements ILeavePolicyRepository {
  private readonly db: Pool;

  constructor(dbPool: Pool = pool) {
    this.db = dbPool;
  }

  async findById(id: number): Promise<LeavePolicy | null> {
    const result = await this.db.query<LeavePolicy>(
      'SELECT * FROM leave_policies WHERE id = $1',
      [id]
    );
    return result.rows[0] ?? null;
  }

  async findByLeaveType(leaveType: LeaveType): Promise<LeavePolicy[]> {
    const result = await this.db.query<LeavePolicy>(
      'SELECT * FROM leave_policies WHERE leave_type = $1',
      [leaveType]
    );
    return result.rows;
  }

  async findActivePolicies(params?: LeavePolicyQueryParams): Promise<LeavePolicy[]> {
    let query = 'SELECT * FROM leave_policies WHERE is_active = true';
    const values: unknown[] = [];
    let paramIndex = 1;

    if (params?.leaveType) {
      query += ` AND leave_type = $${paramIndex}`;
      values.push(params.leaveType);
      paramIndex++;
    }

    if (params?.fiscalYear) {
      query += ` AND fiscal_year = $${paramIndex}`;
      values.push(params.fiscalYear);
      paramIndex++;
    }

    const result = await this.db.query<LeavePolicy>(query, values);
    return result.rows;
  }

  async create(policy: Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeavePolicy> {
    const result = await this.db.query<LeavePolicy>(
      `INSERT INTO leave_policies (
        policy_name, leave_type, entitlement_days, accrual_rate,
        max_accumulation, minimum_notice_days, requires_manager_approval,
        is_active, allow_negative_balance, max_consecutive_days, fiscal_year
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
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
        policy.allowNegativeBalance,
        policy.maxConsecutiveDays,
        policy.fiscalYear,
      ]
    );
    return result.rows[0];
  }

  async update(
    id: number,
    policy: Partial<Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<LeavePolicy | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    const fieldMap: Array<[keyof typeof policy, string]> = [
      ['policyName', 'policy_name'],
      ['leaveType', 'leave_type'],
      ['entitlementDays', 'entitlement_days'],
      ['accrualRate', 'accrual_rate'],
      ['maxAccumulation', 'max_accumulation'],
      ['minimumNoticeDays', 'minimum_notice_days'],
      ['requiresManagerApproval', 'requires_manager_approval'],
      ['isActive', 'is_active'],
      ['allowNegativeBalance', 'allow_negative_balance'],
      ['maxConsecutiveDays', 'max_consecutive_days'],
      ['fiscalYear', 'fiscal_year'],
    ];

    for (const [key, column] of fieldMap) {
      if (policy[key] !== undefined) {
        fields.push(`${column} = $${paramIndex}`);
        values.push(policy[key]);
        paramIndex++;
      }
    }

    if (fields.length === 0) {
      return null;
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await this.db.query<LeavePolicy>(
      `UPDATE leave_policies SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    return result.rows[0] ?? null;
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.db.query(
      'DELETE FROM leave_policies WHERE id = $1',
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  }
}
