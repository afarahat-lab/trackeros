import { Pool, QueryResult } from 'pg';
import { pool } from '../../shared/db/connection';
import { LeavePolicy } from './leave-policy.model';

export interface ILeavePolicyRepository {
  findById(id: string): Promise<LeavePolicy | null>;
  findByLeaveTypeId(leaveTypeId: string): Promise<LeavePolicy[]>;
  findAllActive(): Promise<LeavePolicy[]>;
}

function rowToLeavePolicy(row: Record<string, unknown>): LeavePolicy {
  return {
    id: row.id as string,
    policyName: row.policy_name as string,
    leaveTypeId: row.leave_type_id as string,
    entitlementDays: row.entitlement_days as number,
    accrualRate: (row.accrual_rate as number | null) ?? undefined,
    maxAccumulation: (row.max_accumulation as number | null) ?? undefined,
    minimumNoticeDays: (row.minimum_notice_days as number | null) ?? undefined,
    requiresManagerApproval: row.requires_manager_approval as boolean,
    isActive: row.is_active as boolean,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };
}

export class LeavePolicyRepository implements ILeavePolicyRepository {
  private readonly db: Pool;

  constructor(dbPool: Pool = pool) {
    this.db = dbPool;
  }

  async findById(id: string): Promise<LeavePolicy | null> {
    try {
      const result: QueryResult = await this.db.query(
        'SELECT * FROM leave_policies WHERE id = $1',
        [id],
      );
      if (result.rows.length === 0) {
        return null;
      }
      return rowToLeavePolicy(result.rows[0] as Record<string, unknown>);
    } catch (error: unknown) {
      throw new Error(
        `Failed to find leave policy by id: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async findByLeaveTypeId(leaveTypeId: string): Promise<LeavePolicy[]> {
    try {
      const result: QueryResult = await this.db.query(
        'SELECT * FROM leave_policies WHERE leave_type_id = $1',
        [leaveTypeId],
      );
      return (result.rows as Record<string, unknown>[]).map(rowToLeavePolicy);
    } catch (error: unknown) {
      throw new Error(
        `Failed to find leave policies by leave type id: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async findAllActive(): Promise<LeavePolicy[]> {
    try {
      const result: QueryResult = await this.db.query(
        'SELECT * FROM leave_policies WHERE is_active = true',
      );
      return (result.rows as Record<string, unknown>[]).map(rowToLeavePolicy);
    } catch (error: unknown) {
      throw new Error(
        `Failed to find all active leave policies: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
