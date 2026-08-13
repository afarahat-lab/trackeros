import { Pool } from 'pg';
import { pool } from '../../shared/db/connection';
import { LeavePolicy } from './leave-policy.model';
import {
  ILeavePolicyRepository,
  CreateLeavePolicyDto,
  UpdateLeavePolicyDto,
} from './leave-policy.repository.interface';

interface LeavePolicyRow {
  id: string;
  policy_name: string;
  leave_type_id: string;
  entitlement_days: number;
  accrual_rate: number | null;
  max_accumulation: number | null;
  minimum_notice_days: number | null;
  requires_manager_approval: boolean;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

type Queryable = Pick<Pool, 'query'>;

function rowToLeavePolicy(row: LeavePolicyRow): LeavePolicy {
  return {
    id: row.id,
    policyName: row.policy_name,
    leaveTypeId: row.leave_type_id,
    entitlementDays: row.entitlement_days,
    accrualRate: row.accrual_rate ?? undefined,
    maxAccumulation: row.max_accumulation ?? undefined,
    minimumNoticeDays: row.minimum_notice_days ?? undefined,
    requiresManagerApproval: row.requires_manager_approval,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const COLUMNS = [
  'id',
  'policy_name',
  'leave_type_id',
  'entitlement_days',
  'accrual_rate',
  'max_accumulation',
  'minimum_notice_days',
  'requires_manager_approval',
  'is_active',
  'created_at',
  'updated_at',
].join(', ');

export class LeavePolicyRepository implements ILeavePolicyRepository {
  private readonly db: Queryable;

  constructor(client?: Queryable) {
    this.db = client ?? pool;
  }

  async findAll(): Promise<LeavePolicy[]> {
    const result = await this.db.query<LeavePolicyRow>(
      `SELECT ${COLUMNS} FROM leave_policies ORDER BY policy_name ASC`,
    );
    return result.rows.map(rowToLeavePolicy);
  }

  async findById(id: string): Promise<LeavePolicy | null> {
    const result = await this.db.query<LeavePolicyRow>(
      `SELECT ${COLUMNS} FROM leave_policies WHERE id = $1`,
      [id],
    );
    if (result.rows.length === 0) {
      return null;
    }
    return rowToLeavePolicy(result.rows[0]);
  }

  async findByLeaveTypeId(leaveTypeId: string): Promise<LeavePolicy[]> {
    const result = await this.db.query<LeavePolicyRow>(
      `SELECT ${COLUMNS} FROM leave_policies WHERE leave_type_id = $1 ORDER BY policy_name ASC`,
      [leaveTypeId],
    );
    return result.rows.map(rowToLeavePolicy);
  }

  async findActiveByLeaveTypeId(leaveTypeId: string): Promise<LeavePolicy[]> {
    const result = await this.db.query<LeavePolicyRow>(
      `SELECT ${COLUMNS} FROM leave_policies WHERE leave_type_id = $1 AND is_active = true ORDER BY policy_name ASC`,
      [leaveTypeId],
    );
    return result.rows.map(rowToLeavePolicy);
  }

  async create(dto: CreateLeavePolicyDto): Promise<LeavePolicy> {
    const result = await this.db.query<LeavePolicyRow>(
      `INSERT INTO leave_policies (policy_name, leave_type_id, entitlement_days, accrual_rate, max_accumulation, minimum_notice_days, requires_manager_approval, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
       RETURNING ${COLUMNS}`,
      [
        dto.policyName,
        dto.leaveTypeId,
        dto.entitlementDays,
        dto.accrualRate ?? null,
        dto.maxAccumulation ?? null,
        dto.minimumNoticeDays ?? null,
        dto.requiresManagerApproval ?? true,
        dto.isActive ?? true,
      ],
    );
    return rowToLeavePolicy(result.rows[0]);
  }

  async update(id: string, dto: UpdateLeavePolicyDto): Promise<LeavePolicy | null> {
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (dto.policyName !== undefined) {
      setClauses.push(`policy_name = $${paramIndex++}`);
      values.push(dto.policyName);
    }
    if (dto.leaveTypeId !== undefined) {
      setClauses.push(`leave_type_id = $${paramIndex++}`);
      values.push(dto.leaveTypeId);
    }
    if (dto.entitlementDays !== undefined) {
      setClauses.push(`entitlement_days = $${paramIndex++}`);
      values.push(dto.entitlementDays);
    }
    if (dto.accrualRate !== undefined) {
      setClauses.push(`accrual_rate = $${paramIndex++}`);
      values.push(dto.accrualRate);
    }
    if (dto.maxAccumulation !== undefined) {
      setClauses.push(`max_accumulation = $${paramIndex++}`);
      values.push(dto.maxAccumulation);
    }
    if (dto.minimumNoticeDays !== undefined) {
      setClauses.push(`minimum_notice_days = $${paramIndex++}`);
      values.push(dto.minimumNoticeDays);
    }
    if (dto.requiresManagerApproval !== undefined) {
      setClauses.push(`requires_manager_approval = $${paramIndex++}`);
      values.push(dto.requiresManagerApproval);
    }
    if (dto.isActive !== undefined) {
      setClauses.push(`is_active = $${paramIndex++}`);
      values.push(dto.isActive);
    }

    if (setClauses.length === 0) {
      return this.findById(id);
    }

    setClauses.push(`updated_at = NOW()`);
    values.push(id);

    const result = await this.db.query<LeavePolicyRow>(
      `UPDATE leave_policies SET ${setClauses.join(', ')} WHERE id = $${paramIndex}
       RETURNING ${COLUMNS}`,
      values,
    );

    if (result.rows.length === 0) {
      return null;
    }
    return rowToLeavePolicy(result.rows[0]);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db.query(
      'DELETE FROM leave_policies WHERE id = $1',
      [id],
    );
    return (result.rowCount ?? 0) > 0;
  }
}
