import { pool } from '../../shared/db/connection';
import { LeavePolicy } from './policy.model';
import { ILeavePolicyRepository } from './policy.repository.interface';
import { LeaveType } from '../../shared/types/index';

export class PgLeavePolicyRepository implements ILeavePolicyRepository {
  async findById(id: string): Promise<LeavePolicy | null> {
    try {
      const result = await pool.query(
        'SELECT id, policy_name, leave_type, entitlement_days, accrual_rate, max_accumulation, minimum_notice_days, requires_manager_approval, is_active, created_at, updated_at FROM leave_policies WHERE id = $1',
        [id]
      );
      if (result.rows.length === 0) return null;
      return this.mapRowToPolicy(result.rows[0]);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to find policy by id: ${message}`);
    }
  }

  async findByLeaveType(leaveType: LeaveType): Promise<LeavePolicy | null> {
    try {
      const result = await pool.query(
        'SELECT id, policy_name, leave_type, entitlement_days, accrual_rate, max_accumulation, minimum_notice_days, requires_manager_approval, is_active, created_at, updated_at FROM leave_policies WHERE leave_type = $1',
        [leaveType]
      );
      if (result.rows.length === 0) return null;
      return this.mapRowToPolicy(result.rows[0]);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to find policy by leave type: ${message}`);
    }
  }

  async findAllActive(): Promise<LeavePolicy[]> {
    try {
      const result = await pool.query(
        'SELECT id, policy_name, leave_type, entitlement_days, accrual_rate, max_accumulation, minimum_notice_days, requires_manager_approval, is_active, created_at, updated_at FROM leave_policies WHERE is_active = true ORDER BY policy_name'
      );
      return result.rows.map(row => this.mapRowToPolicy(row));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to find active policies: ${message}`);
    }
  }

  async create(policy: Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeavePolicy> {
    try {
      const result = await pool.query(
        `INSERT INTO leave_policies (policy_name, leave_type, entitlement_days, accrual_rate, max_accumulation, minimum_notice_days, requires_manager_approval, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, policy_name, leave_type, entitlement_days, accrual_rate, max_accumulation, minimum_notice_days, requires_manager_approval, is_active, created_at, updated_at`,
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
      return this.mapRowToPolicy(result.rows[0]);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to create policy: ${message}`);
    }
  }

  async update(id: string, data: Partial<LeavePolicy>): Promise<LeavePolicy | null> {
    try {
      const setClauses: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      if (data.policyName !== undefined) {
        setClauses.push(`policy_name = $${paramIndex++}`);
        values.push(data.policyName);
      }
      if (data.leaveType !== undefined) {
        setClauses.push(`leave_type = $${paramIndex++}`);
        values.push(data.leaveType);
      }
      if (data.entitlementDays !== undefined) {
        setClauses.push(`entitlement_days = $${paramIndex++}`);
        values.push(data.entitlementDays);
      }
      if (data.accrualRate !== undefined) {
        setClauses.push(`accrual_rate = $${paramIndex++}`);
        values.push(data.accrualRate);
      }
      if (data.maxAccumulation !== undefined) {
        setClauses.push(`max_accumulation = $${paramIndex++}`);
        values.push(data.maxAccumulation);
      }
      if (data.minimumNoticeDays !== undefined) {
        setClauses.push(`minimum_notice_days = $${paramIndex++}`);
        values.push(data.minimumNoticeDays);
      }
      if (data.requiresManagerApproval !== undefined) {
        setClauses.push(`requires_manager_approval = $${paramIndex++}`);
        values.push(data.requiresManagerApproval);
      }
      if (data.isActive !== undefined) {
        setClauses.push(`is_active = $${paramIndex++}`);
        values.push(data.isActive);
      }

      if (setClauses.length === 0) {
        return this.findById(id);
      }

      setClauses.push(`updated_at = NOW()`);
      values.push(id);

      const result = await pool.query(
        `UPDATE leave_policies SET ${setClauses.join(', ')} WHERE id = $${paramIndex}
         RETURNING id, policy_name, leave_type, entitlement_days, accrual_rate, max_accumulation, minimum_notice_days, requires_manager_approval, is_active, created_at, updated_at`,
        values
      );

      if (result.rows.length === 0) return null;
      return this.mapRowToPolicy(result.rows[0]);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to update policy: ${message}`);
    }
  }

  private mapRowToPolicy(row: Record<string, unknown>): LeavePolicy {
    return {
      id: row.id as string,
      policyName: row.policy_name as string,
      leaveType: row.leave_type as LeaveType,
      entitlementDays: Number(row.entitlement_days),
      accrualRate: row.accrual_rate != null ? Number(row.accrual_rate) : undefined,
      maxAccumulation: row.max_accumulation != null ? Number(row.max_accumulation) : undefined,
      minimumNoticeDays: row.minimum_notice_days != null ? Number(row.minimum_notice_days) : undefined,
      requiresManagerApproval: Boolean(row.requires_manager_approval),
      isActive: Boolean(row.is_active),
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }
}
