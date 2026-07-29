import { pool } from '../../shared/db/connection';
import { LeavePolicy } from './leave-policy.model';
import { ILeavePolicyRepository } from './leave-policy.repository.interface';
import { LeaveType } from '../../shared/types/leave-type.enum';
import crypto from 'crypto';

export class PgLeavePolicyRepository implements ILeavePolicyRepository {
  private mapRowToLeavePolicy(row: any): LeavePolicy {
    return {
      id: row.id,
      policyName: row.policy_name ?? row.policyName,
      leaveType: (row.leave_type ?? row.leaveType) as LeaveType,
      entitlementDays: row.entitlement_days ?? row.entitlementDays,
      accrualRate: row.accrual_rate ?? row.accrualRate,
      maxAccumulation: row.max_accumulation ?? row.maxAccumulation,
      minimumNoticeDays: row.minimum_notice_days ?? row.minimumNoticeDays,
      requiresManagerApproval: row.requires_manager_approval ?? row.requiresManagerApproval,
      isActive: row.is_active ?? row.isActive,
      createdAt: row.created_at ?? row.createdAt,
      updatedAt: row.updated_at ?? row.updatedAt,
    };
  }

  async findAll(): Promise<LeavePolicy[]> {
    try {
      const { rows } = await pool.query('SELECT * FROM leave_policies ORDER BY created_at DESC;');
      return rows.map(row => this.mapRowToLeavePolicy(row));
    } catch (error) {
      console.error('Error in findAll:', error);
      throw error;
    }
  }

  async findById(id: string): Promise<LeavePolicy | null> {
    try {
      const { rows } = await pool.query('SELECT * FROM leave_policies WHERE id = $1;', [id]);
      return rows[0] ? this.mapRowToLeavePolicy(rows[0]) : null;
    } catch (error) {
      console.error('Error in findById:', error);
      throw error;
    }
  }

  async findByLeaveType(leaveType: LeaveType): Promise<LeavePolicy[]> {
    try {
      const { rows } = await pool.query('SELECT * FROM leave_policies WHERE leave_type = $1;', [leaveType]);
      return rows.map(row => this.mapRowToLeavePolicy(row));
    } catch (error) {
      console.error('Error in findByLeaveType:', error);
      throw error;
    }
  }

  async create(policy: Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeavePolicy> {
    try {
      const id = crypto.randomUUID();
      const now = new Date();
      const { rows } = await pool.query(
        `INSERT INTO leave_policies (id, policy_name, leave_type, entitlement_days, accrual_rate, max_accumulation, minimum_notice_days, requires_manager_approval, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *;`,
        [
          id,
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
        ]
      );
      return this.mapRowToLeavePolicy(rows[0]);
    } catch (error) {
      console.error('Error in create:', error);
      throw error;
    }
  }

  async update(id: string, policy: Partial<LeavePolicy>): Promise<LeavePolicy | null> {
    try {
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

      const setClauses: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      for (const [key, value] of Object.entries(policy)) {
        if (value !== undefined) {
          const column = columnMap[key];
          if (column) {
            setClauses.push(`${column} = $${paramIndex}`);
            values.push(value);
            paramIndex++;
          }
        }
      }

      if (setClauses.length === 0) {
        return this.findById(id);
      }

      // always update updated_at
      setClauses.push(`updated_at = NOW()`);

      const query = `UPDATE leave_policies SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *;`;
      values.push(id);

      const { rows } = await pool.query(query, values);
      return rows[0] ? this.mapRowToLeavePolicy(rows[0]) : null;
    } catch (error) {
      console.error('Error in update:', error);
      throw error;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const { rowCount } = await pool.query('DELETE FROM leave_policies WHERE id = $1;', [id]);
      return (rowCount ?? 0) > 0;
    } catch (error) {
      console.error('Error in delete:', error);
      throw error;
    }
  }
}
