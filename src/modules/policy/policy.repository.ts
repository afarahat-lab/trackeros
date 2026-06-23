import { PoolClient } from 'pg';
import { BaseRepository } from '../../shared/base-repository';
import { pool } from '../../shared/db/connection';
import { LeavePolicy } from './policy.model';

export class LeavePolicyRepository extends BaseRepository<LeavePolicy> {
  constructor() {
    super(pool);
  }

  async findById(id: string, client?: PoolClient): Promise<LeavePolicy | null> {
    const executor = client || this.pool;
    const result = await executor.query('SELECT * FROM leave_policies WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  async findAll(filters?: Record<string, any>, client?: PoolClient): Promise<LeavePolicy[]> {
    const executor = client || this.pool;
    const result = await executor.query('SELECT * FROM leave_policies');
    return result.rows;
  }

  async create(entity: Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>, client?: PoolClient): Promise<LeavePolicy> {
    const executor = client || this.pool;
    const result = await executor.query(
      `INSERT INTO leave_policies (policy_name, leave_type, entitlement_days, accrual_rate, max_accumulation, minimum_notice_days, requires_manager_approval, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        entity.policyName, entity.leaveType, entity.entitlementDays, entity.accrualRate, 
        entity.maxAccumulation, entity.minimumNoticeDays, entity.requiresManagerApproval, entity.isActive
      ]
    );
    return result.rows[0];
  }

  async update(id: string, updates: Partial<LeavePolicy>, client?: PoolClient): Promise<LeavePolicy> {
    const executor = client || this.pool;
    const keys = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = keys.map((key, index) => `${key.replace(/([A-Z])/g, '_$1').toLowerCase()} = $${index + 2}`).join(', ');
    
    const result = await executor.query(
      `UPDATE leave_policies SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    return result.rows[0];
  }

  async delete(id: string, client?: PoolClient): Promise<void> {
    const executor = client || this.pool;
    await executor.query('DELETE FROM leave_policies WHERE id = $1', [id]);
  }
}
