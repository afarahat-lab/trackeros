import { randomUUID } from 'crypto';
import { Pool, PoolClient, QueryResult } from 'pg';
import { pool as defaultPool } from '../../shared/db/connection';
import { LeaveTypeCode } from '../../shared/types';
import { LeavePolicy, CreateLeavePolicyInput, LeavePolicyStatus } from './policy.model';
import { IPolicyRepository } from './policy.repository.interface';

interface LeavePolicyRow {
  id: string;
  leave_type_code: string;
  policy_name: string;
  annual_entitlement_days: number;
  accrual_period_months: number;
  carry_forward_days: number;
  min_notice_days: number;
  max_request_days: number;
  requires_manager_approval: boolean;
  effective_from: Date;
  effective_to: Date | null;
  status: string;
}

function mapRow(row: LeavePolicyRow): LeavePolicy {
  return {
    id: row.id,
    leaveTypeCode: row.leave_type_code as LeavePolicy['leaveTypeCode'],
    policyName: row.policy_name,
    annualEntitlementDays: row.annual_entitlement_days,
    accrualPeriodMonths: row.accrual_period_months,
    carryForwardDays: row.carry_forward_days,
    minNoticeDays: row.min_notice_days,
    maxRequestDays: row.max_request_days,
    requiresManagerApproval: row.requires_manager_approval,
    effectiveFrom: row.effective_from,
    effectiveTo: row.effective_to,
    status: row.status as LeavePolicy['status'],
  };
}

const COLUMNS = `
  id, leave_type_code, policy_name, annual_entitlement_days, accrual_period_months,
  carry_forward_days, min_notice_days, max_request_days, requires_manager_approval,
  effective_from, effective_to, status
`;

export class PgLeavePolicyRepository implements IPolicyRepository {
  constructor(private readonly dbPool: Pool = defaultPool) {}

  private db(client?: PoolClient): Pool | PoolClient {
    return client ?? this.dbPool;
  }

  async create(input: CreateLeavePolicyInput, client?: PoolClient): Promise<LeavePolicy> {
    const id = randomUUID();
    const query = `
      INSERT INTO leave_policies (
        id, leave_type_code, policy_name, annual_entitlement_days, accrual_period_months,
        carry_forward_days, min_notice_days, max_request_days, requires_manager_approval,
        effective_from, effective_to, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING ${COLUMNS}
    `;
    const values = [
      id,
      input.leaveTypeCode,
      input.policyName,
      input.annualEntitlementDays,
      input.accrualPeriodMonths,
      input.carryForwardDays,
      input.minNoticeDays,
      input.maxRequestDays,
      input.requiresManagerApproval,
      input.effectiveFrom,
      input.effectiveTo,
      input.status,
    ];
    const result: QueryResult<LeavePolicyRow> = await this.db(client).query(query, values);
    return mapRow(result.rows[0]);
  }

  async findById(id: string, client?: PoolClient): Promise<LeavePolicy | null> {
    const query = `SELECT ${COLUMNS} FROM leave_policies WHERE id = $1`;
    const result: QueryResult<LeavePolicyRow> = await this.db(client).query(query, [id]);
    return result.rows.length ? mapRow(result.rows[0]) : null;
  }

  async findByLeaveTypeCode(
    leaveTypeCode: LeaveTypeCode,
    client?: PoolClient
  ): Promise<LeavePolicy | null> {
    const query = `SELECT ${COLUMNS} FROM leave_policies WHERE leave_type_code = $1`;
    const result: QueryResult<LeavePolicyRow> = await this.db(client).query(query, [
      leaveTypeCode,
    ]);
    return result.rows.length ? mapRow(result.rows[0]) : null;
  }

  async findAll(client?: PoolClient): Promise<LeavePolicy[]> {
    const query = `SELECT ${COLUMNS} FROM leave_policies`;
    const result: QueryResult<LeavePolicyRow> = await this.db(client).query(query);
    return result.rows.map(mapRow);
  }
}
