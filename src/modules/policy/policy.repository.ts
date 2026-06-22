import { Pool } from 'pg';
import { pool } from '../../shared/db/connection';
import { LeavePolicy } from './policy.model';

export interface ILeavePolicyRepository {
  findByLeaveTypeId(leaveTypeId: string): Promise<LeavePolicy | null>;
}

export class LeavePolicyRepository implements ILeavePolicyRepository {
  private db: Pool;

  constructor(dbPool: Pool = pool) {
    this.db = dbPool;
  }

  async findByLeaveTypeId(leaveTypeId: string): Promise<LeavePolicy | null> {
    const result = await this.db.query(
      'SELECT id, leave_type_id, max_days_per_year, max_consecutive_days, requires_approval, min_notice_days, created_at, updated_at FROM leave_policies WHERE leave_type_id = $1',
      [leaveTypeId]
    );
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return {
      id: row.id,
      leaveTypeId: row.leave_type_id,
      maxDaysPerYear: row.max_days_per_year,
      maxConsecutiveDays: row.max_consecutive_days,
      requiresApproval: row.requires_approval,
      minNoticeDays: row.min_notice_days,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
