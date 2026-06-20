import { Pool } from 'pg';
import { IPolicyRepository } from './policy.repository.interface';
import { LeavePolicy } from '../../shared/types';

export class PolicyRepository implements IPolicyRepository {
  constructor(private readonly pool: Pool) {}

  async findByLeaveTypeId(leaveTypeId: string): Promise<LeavePolicy | null> {
    const result = await this.pool.query('SELECT * FROM leave_policies WHERE leave_type_id = $1', [leaveTypeId]);
    return result.rows[0] || null;
  }

  async findAll(): Promise<LeavePolicy[]> {
    const result = await this.pool.query('SELECT * FROM leave_policies');
    return result.rows;
  }

  async create(policy: Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeavePolicy> {
    const result = await this.pool.query(
      'INSERT INTO leave_policies (leave_type_id, max_days, requires_approval) VALUES ($1, $2, $3) RETURNING *',
      [policy.leaveTypeId, policy.maxDays, policy.requiresApproval]
    );
    return result.rows[0];
  }

  async update(id: string, updates: Partial<LeavePolicy>): Promise<LeavePolicy> {
    const fields = Object.keys(updates) as Array<keyof LeavePolicy>;
    const values = fields.map(field => updates[field]);
    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    
    const result = await this.pool.query(
      `UPDATE leave_policies SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    return result.rows[0];
  }

  async delete(id: string): Promise<void> {
    await this.pool.query('DELETE FROM leave_policies WHERE id = $1', [id]);
  }
}
