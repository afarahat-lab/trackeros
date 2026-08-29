import type { PoolClient } from 'pg';

import { pool } from '../../shared/db/connection';
import {
  BalanceStatus,
  ILeaveBalanceRepository,
  LeaveBalance
} from './balance.model';

const COLUMNS = [
  'id',
  'employee_id',
  'policy_id',
  'fiscal_year',
  'total_entitlement',
  'used_days',
  'pending_days',
  'status',
  'created_at',
  'updated_at'
] as const;

interface LeaveBalanceRow {
  id: string;
  employee_id: string;
  policy_id: string;
  fiscal_year: number;
  total_entitlement: number;
  used_days: number;
  pending_days: number;
  status: BalanceStatus;
  created_at: Date;
  updated_at: Date;
}

function mapRow(row: LeaveBalanceRow): LeaveBalance {
  const usedDays = row.used_days;
  const pendingDays = row.pending_days;
  return {
    id: row.id,
    employeeId: row.employee_id,
    policyId: row.policy_id,
    fiscalYear: row.fiscal_year,
    totalEntitlement: row.total_entitlement,
    usedDays,
    pendingDays,
    remainingDays: row.total_entitlement - usedDays - pendingDays,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export class PgLeaveBalanceRepository implements ILeaveBalanceRepository {
  async create(balance: LeaveBalance, client?: PoolClient): Promise<LeaveBalance> {
    const db = client ?? pool;
    const result = await db.query(
      `INSERT INTO leave_balances (
         id, employee_id, policy_id, fiscal_year, total_entitlement,
         used_days, pending_days, status, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, employee_id, policy_id, fiscal_year, total_entitlement,
         used_days, pending_days, status, created_at, updated_at`,
      [
        balance.id,
        balance.employeeId,
        balance.policyId,
        balance.fiscalYear,
        balance.totalEntitlement,
        balance.usedDays,
        balance.pendingDays,
        balance.status,
        balance.createdAt,
        balance.updatedAt
      ]
    );
    return mapRow(result.rows[0] as LeaveBalanceRow);
  }

  async update(balance: LeaveBalance, client?: PoolClient): Promise<LeaveBalance> {
    const db = client ?? pool;
    const result = await db.query(
      `UPDATE leave_balances
       SET employee_id = $2, policy_id = $3, fiscal_year = $4,
           total_entitlement = $5, used_days = $6, pending_days = $7,
           status = $8, updated_at = $9
       WHERE id = $1
       RETURNING id, employee_id, policy_id, fiscal_year, total_entitlement,
         used_days, pending_days, status, created_at, updated_at`,
      [
        balance.id,
        balance.employeeId,
        balance.policyId,
        balance.fiscalYear,
        balance.totalEntitlement,
        balance.usedDays,
        balance.pendingDays,
        balance.status,
        balance.updatedAt
      ]
    );
    return mapRow(result.rows[0] as LeaveBalanceRow);
  }

  async findById(id: string, client?: PoolClient): Promise<LeaveBalance | null> {
    const db = client ?? pool;
    const result = await db.query(
      `SELECT id, employee_id, policy_id, fiscal_year, total_entitlement,
         used_days, pending_days, status, created_at, updated_at
       FROM leave_balances WHERE id = $1`,
      [id]
    );
    const row = result.rows[0] as LeaveBalanceRow | undefined;
    return row ? mapRow(row) : null;
  }

  async findByEmployeePolicyAndYear(
    employeeId: string,
    policyId: string,
    fiscalYear: number,
    client?: PoolClient
  ): Promise<LeaveBalance | null> {
    const db = client ?? pool;
    const result = await db.query(
      `SELECT id, employee_id, policy_id, fiscal_year, total_entitlement,
         used_days, pending_days, status, created_at, updated_at
       FROM leave_balances
       WHERE employee_id = $1 AND policy_id = $2 AND fiscal_year = $3`,
      [employeeId, policyId, fiscalYear]
    );
    const row = result.rows[0] as LeaveBalanceRow | undefined;
    return row ? mapRow(row) : null;
  }

  async findByEmployeeAndYear(
    employeeId: string,
    fiscalYear: number,
    client?: PoolClient
  ): Promise<LeaveBalance[]> {
    const db = client ?? pool;
    const result = await db.query(
      `SELECT id, employee_id, policy_id, fiscal_year, total_entitlement,
         used_days, pending_days, status, created_at, updated_at
       FROM leave_balances
       WHERE employee_id = $1 AND fiscal_year = $2`,
      [employeeId, fiscalYear]
    );
    return (result.rows as LeaveBalanceRow[]).map(mapRow);
  }
}
