import { pool } from '../../shared/db/connection';
import { LeavePolicy } from './leave-policy.model';

const COLUMN_MAP: Record<string, string> = {
  policyName: 'policy_name',
  leaveTypeId: 'leave_type_id',
  entitlementDays: 'entitlement_days',
  accrualRate: 'accrual_rate',
  maxAccumulation: 'max_accumulation',
  minimumNoticeDays: 'minimum_notice_days',
  requiresManagerApproval: 'requires_manager_approval',
  isActive: 'is_active',
};

const READ_ONLY_FIELDS = new Set(['id', 'createdAt', 'updatedAt']);

function rowToLeavePolicy(row: Record<string, unknown>): LeavePolicy {
  return {
    id: row.id as string,
    policyName: row.policy_name as string,
    leaveTypeId: row.leave_type_id as string,
    entitlementDays: row.entitlement_days as number,
    accrualRate: (row.accrual_rate as number | undefined) ?? undefined,
    maxAccumulation: (row.max_accumulation as number | undefined) ?? undefined,
    minimumNoticeDays: (row.minimum_notice_days as number | undefined) ?? undefined,
    requiresManagerApproval: row.requires_manager_approval as boolean,
    isActive: row.is_active as boolean,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };
}

export interface ILeavePolicyRepository {
  findById(id: string): Promise<LeavePolicy | null>;
  findByLeaveTypeId(leaveTypeId: string): Promise<LeavePolicy[]>;
  findActiveByLeaveTypeId(leaveTypeId: string): Promise<LeavePolicy | null>;
  findAll(): Promise<LeavePolicy[]>;
  create(policy: Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeavePolicy>;
  update(id: string, data: Partial<LeavePolicy>): Promise<LeavePolicy | null>;
}

export class LeavePolicyRepository implements ILeavePolicyRepository {
  async findById(id: string): Promise<LeavePolicy | null> {
    const result = await pool.query(
      'SELECT * FROM leave_policies WHERE id = $1',
      [id],
    );
    if (result.rows.length === 0) {
      return null;
    }
    return rowToLeavePolicy(result.rows[0]);
  }

  async findByLeaveTypeId(leaveTypeId: string): Promise<LeavePolicy[]> {
    const result = await pool.query(
      'SELECT * FROM leave_policies WHERE leave_type_id = $1',
      [leaveTypeId],
    );
    return result.rows.map(rowToLeavePolicy);
  }

  async findActiveByLeaveTypeId(leaveTypeId: string): Promise<LeavePolicy | null> {
    const result = await pool.query(
      'SELECT * FROM leave_policies WHERE leave_type_id = $1 AND is_active = true',
      [leaveTypeId],
    );
    if (result.rows.length === 0) {
      return null;
    }
    return rowToLeavePolicy(result.rows[0]);
  }

  async findAll(): Promise<LeavePolicy[]> {
    const result = await pool.query('SELECT * FROM leave_policies');
    return result.rows.map(rowToLeavePolicy);
  }

  async create(policy: Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeavePolicy> {
    const result = await pool.query(
      `INSERT INTO leave_policies (
        policy_name, leave_type_id, entitlement_days, accrual_rate,
        max_accumulation, minimum_notice_days, requires_manager_approval, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        policy.policyName,
        policy.leaveTypeId,
        policy.entitlementDays,
        policy.accrualRate,
        policy.maxAccumulation,
        policy.minimumNoticeDays,
        policy.requiresManagerApproval,
        policy.isActive,
      ],
    );
    return rowToLeavePolicy(result.rows[0]);
  }

  async update(id: string, data: Partial<LeavePolicy>): Promise<LeavePolicy | null> {
    const keys = Object.keys(data).filter((k) => !READ_ONLY_FIELDS.has(k));
    if (keys.length === 0) {
      const existing = await this.findById(id);
      return existing;
    }

    const setClauses = keys.map((key, index) => {
      const column = COLUMN_MAP[key] ?? key;
      return `${column} = $${index + 2}`;
    });
    const values = keys.map((key) => (data as Record<string, unknown>)[key]);

    const result = await pool.query(
      `UPDATE leave_policies SET ${setClauses.join(', ')}, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, ...values],
    );
    if (result.rows.length === 0) {
      return null;
    }
    return rowToLeavePolicy(result.rows[0]);
  }
}
