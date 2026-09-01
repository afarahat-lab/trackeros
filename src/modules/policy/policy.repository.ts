import { randomUUID } from 'crypto';
import type { Pool, PoolClient } from 'pg';

import { pool } from '../../shared/db';
import { LeaveType } from '../../shared/types';
import { PolicyNotFoundError, UniqueConstraintError } from './policy.errors';
import type {
  LeavePolicy,
  CreateLeavePolicyInput,
  UpdateLeavePolicyInput,
} from './policy.model';

const POLICY_COLUMNS =
  'id, policy_name, leave_type, entitlement_days, accrual_rate, max_accumulation, minimum_notice_days, requires_manager_approval, is_active, created_at, updated_at';

const UNIQUE_CONSTRAINT_CODE = '23505';

interface PolicyRow {
  id: string;
  policy_name: string;
  leave_type: string;
  entitlement_days: number;
  accrual_rate: number | null;
  max_accumulation: number | null;
  minimum_notice_days: number | null;
  requires_manager_approval: boolean;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface ILeavePolicyRepository {
  create(input: CreateLeavePolicyInput, client?: PoolClient): Promise<LeavePolicy>;
  findById(id: string): Promise<LeavePolicy | null>;
  findByLeaveType(leaveType: LeaveType): Promise<LeavePolicy[]>;
  findActive(): Promise<LeavePolicy[]>;
  update(id: string, changes: UpdateLeavePolicyInput, client?: PoolClient): Promise<LeavePolicy>;
}

function mapRow(row: PolicyRow): LeavePolicy {
  return {
    id: row.id,
    policyName: row.policy_name,
    leaveType: row.leave_type as LeaveType,
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

export class LeavePolicyRepository implements ILeavePolicyRepository {
  async create(input: CreateLeavePolicyInput, client?: PoolClient): Promise<LeavePolicy> {
    const conn: Pool | PoolClient = client ?? pool;
    const now = new Date();

    try {
      const result = await conn.query<PolicyRow>(
        `INSERT INTO leave_policies
           (id, policy_name, leave_type, entitlement_days, accrual_rate, max_accumulation, minimum_notice_days, requires_manager_approval, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING ${POLICY_COLUMNS}`,
        [
          randomUUID(),
          input.policyName,
          input.leaveType,
          input.entitlementDays,
          input.accrualRate ?? null,
          input.maxAccumulation ?? null,
          input.minimumNoticeDays ?? null,
          input.requiresManagerApproval ?? false,
          input.isActive ?? true,
          now,
          now,
        ]
      );

      return mapRow(result.rows[0]);
    } catch (err) {
      if (isPgUniqueViolation(err)) {
        throw new UniqueConstraintError(
          'A leave policy with these values already exists'
        );
      }
      throw err;
    }
  }

  async findById(id: string): Promise<LeavePolicy | null> {
    const result = await pool.query<PolicyRow>(
      `SELECT ${POLICY_COLUMNS} FROM leave_policies WHERE id = $1`,
      [id]
    );

    return result.rows[0] ? mapRow(result.rows[0]) : null;
  }

  async findByLeaveType(leaveType: LeaveType): Promise<LeavePolicy[]> {
    const result = await pool.query<PolicyRow>(
      `SELECT ${POLICY_COLUMNS} FROM leave_policies WHERE leave_type = $1 ORDER BY policy_name ASC`,
      [leaveType]
    );

    return result.rows.map(mapRow);
  }

  async findActive(): Promise<LeavePolicy[]> {
    const result = await pool.query<PolicyRow>(
      `SELECT ${POLICY_COLUMNS} FROM leave_policies WHERE is_active = TRUE ORDER BY policy_name ASC`
    );

    return result.rows.map(mapRow);
  }

  async update(id: string, changes: UpdateLeavePolicyInput, client?: PoolClient): Promise<LeavePolicy> {
    const conn: Pool | PoolClient = client ?? pool;
    const now = new Date();

    const assignments: string[] = ['updated_at = $2'];
    const values: unknown[] = [id, now];
    let paramIndex = 2;

    const fields: ReadonlyArray<readonly [string, unknown]> = [
      ['policy_name', changes.policyName],
      ['leave_type', changes.leaveType],
      ['entitlement_days', changes.entitlementDays],
      ['accrual_rate', changes.accrualRate],
      ['max_accumulation', changes.maxAccumulation],
      ['minimum_notice_days', changes.minimumNoticeDays],
      ['requires_manager_approval', changes.requiresManagerApproval],
      ['is_active', changes.isActive],
    ];

    for (const [column, value] of fields) {
      if (value !== undefined) {
        paramIndex += 1;
        assignments.push(`${column} = $${paramIndex}`);
        values.push(value);
      }
    }

    try {
      const result = await conn.query<PolicyRow>(
        `UPDATE leave_policies SET ${assignments.join(', ')} WHERE id = $1 RETURNING ${POLICY_COLUMNS}`,
        values
      );

      const row = result.rows[0];
      if (!row) {
        throw new PolicyNotFoundError(id);
      }

      return mapRow(row);
    } catch (err) {
      if (isPgUniqueViolation(err)) {
        throw new UniqueConstraintError(
          'A leave policy with these values already exists'
        );
      }
      throw err;
    }
  }
}

interface PgError {
  code: string;
}

function isPgError(err: unknown): err is PgError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    typeof (err as { code?: unknown }).code === 'string'
  );
}

function isPgUniqueViolation(err: unknown): err is PgError {
  return isPgError(err) && err.code === UNIQUE_CONSTRAINT_CODE;
}
