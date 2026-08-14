import { PoolClient } from 'pg';
import { pool } from '../../shared/db/connection';
import { LeavePolicy } from './leave-policy.model';
import { LeaveType } from '../../shared/types/leave.types';

export interface ILeavePolicyRepository {
  findById(id: string, client?: PoolClient): Promise<LeavePolicy | null>;
  findByLeaveType(leaveType: LeaveType, client?: PoolClient): Promise<LeavePolicy[]>;
  findAllActive(client?: PoolClient): Promise<LeavePolicy[]>;
}

export class PgLeavePolicyRepository implements ILeavePolicyRepository {
  async findById(id: string, client?: PoolClient): Promise<LeavePolicy | null> {
    const db = client ?? pool;
    const result = await db.query(
      'SELECT * FROM leave_policies WHERE id = $1',
      [id],
    );
    if (result.rows.length === 0) {
      return null;
    }
    return this.rowToLeavePolicy(result.rows[0]);
  }

  async findByLeaveType(leaveType: LeaveType, client?: PoolClient): Promise<LeavePolicy[]> {
    const db = client ?? pool;
    const result = await db.query(
      'SELECT * FROM leave_policies WHERE leave_type = $1',
      [leaveType],
    );
    return result.rows.map((row) => this.rowToLeavePolicy(row));
  }

  async findAllActive(client?: PoolClient): Promise<LeavePolicy[]> {
    const db = client ?? pool;
    const result = await db.query(
      'SELECT * FROM leave_policies WHERE is_active = true',
    );
    return result.rows.map((row) => this.rowToLeavePolicy(row));
  }

  private rowToLeavePolicy(row: Record<string, unknown>): LeavePolicy {
    return {
      id: row.id as string,
      policyName: row.policy_name as string,
      leaveType: row.leave_type as LeaveType,
      entitlementDays: row.entitlement_days as number,
      accrualRate: (row.accrual_rate as number) ?? null,
      maxAccumulation: (row.max_accumulation as number) ?? null,
      minimumNoticeDays: (row.minimum_notice_days as number) ?? null,
      requiresManagerApproval: row.requires_manager_approval as boolean,
      isActive: row.is_active as boolean,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }
}
