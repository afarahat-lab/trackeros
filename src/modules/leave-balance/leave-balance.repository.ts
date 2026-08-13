import { Pool } from 'pg';
import { pool } from '../../shared/db/connection';
import { LeaveBalance } from './leave-balance.model';
import {
  ILeaveBalanceRepository,
  CreateLeaveBalanceDto,
  UpdateLeaveBalanceDto,
} from './leave-balance.repository.interface';

interface LeaveBalanceRow {
  id: string;
  employee_id: string;
  policy_id: string;
  total_entitlement: number;
  used_days: number;
  pending_days: number;
  remaining_days: number;
  fiscal_year: number;
  status: 'ACTIVE' | 'CLOSED';
  created_at: Date;
  updated_at: Date;
}

type Queryable = Pick<Pool, 'query'>;

function rowToLeaveBalance(row: LeaveBalanceRow): LeaveBalance {
  return {
    id: row.id,
    employeeId: row.employee_id,
    policyId: row.policy_id,
    totalEntitlement: row.total_entitlement,
    usedDays: row.used_days,
    pendingDays: row.pending_days,
    remainingDays: row.total_entitlement - row.used_days - row.pending_days,
    fiscalYear: row.fiscal_year,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const COLUMNS = [
  'id',
  'employee_id',
  'policy_id',
  'total_entitlement',
  'used_days',
  'pending_days',
  'remaining_days',
  'fiscal_year',
  'status',
  'created_at',
  'updated_at',
].join(', ');

export class LeaveBalanceRepository implements ILeaveBalanceRepository {
  private readonly db: Queryable;

  constructor(client?: Queryable) {
    this.db = client ?? pool;
  }

  async findByEmployeeId(employeeId: string): Promise<LeaveBalance[]> {
    const result = await this.db.query<LeaveBalanceRow>(
      `SELECT ${COLUMNS} FROM leave_balances WHERE employee_id = $1 ORDER BY fiscal_year DESC, policy_id ASC`,
      [employeeId],
    );
    return result.rows.map(rowToLeaveBalance);
  }

  async findByEmployeeIdAndFiscalYear(
    employeeId: string,
    fiscalYear: number,
  ): Promise<LeaveBalance[]> {
    const result = await this.db.query<LeaveBalanceRow>(
      `SELECT ${COLUMNS} FROM leave_balances WHERE employee_id = $1 AND fiscal_year = $2 ORDER BY policy_id ASC`,
      [employeeId, fiscalYear],
    );
    return result.rows.map(rowToLeaveBalance);
  }

  async findByEmployeeIdAndPolicyId(
    employeeId: string,
    policyId: string,
    fiscalYear: number,
  ): Promise<LeaveBalance | null> {
    const result = await this.db.query<LeaveBalanceRow>(
      `SELECT ${COLUMNS} FROM leave_balances WHERE employee_id = $1 AND policy_id = $2 AND fiscal_year = $3`,
      [employeeId, policyId, fiscalYear],
    );
    if (result.rows.length === 0) {
      return null;
    }
    return rowToLeaveBalance(result.rows[0]);
  }

  async create(dto: CreateLeaveBalanceDto): Promise<LeaveBalance> {
    const result = await this.db.query<LeaveBalanceRow>(
      `INSERT INTO leave_balances (employee_id, policy_id, total_entitlement, used_days, pending_days, remaining_days, fiscal_year, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
       RETURNING ${COLUMNS}`,
      [
        dto.employeeId,
        dto.policyId,
        dto.totalEntitlement,
        dto.usedDays ?? 0,
        dto.pendingDays ?? 0,
        dto.remainingDays ?? dto.totalEntitlement,
        dto.fiscalYear,
        dto.status ?? 'ACTIVE',
      ],
    );
    return rowToLeaveBalance(result.rows[0]);
  }

  async update(id: string, dto: UpdateLeaveBalanceDto): Promise<LeaveBalance | null> {
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (dto.totalEntitlement !== undefined) {
      setClauses.push(`total_entitlement = $${paramIndex++}`);
      values.push(dto.totalEntitlement);
    }
    if (dto.usedDays !== undefined) {
      setClauses.push(`used_days = $${paramIndex++}`);
      values.push(dto.usedDays);
    }
    if (dto.pendingDays !== undefined) {
      setClauses.push(`pending_days = $${paramIndex++}`);
      values.push(dto.pendingDays);
    }
    if (dto.remainingDays !== undefined) {
      setClauses.push(`remaining_days = $${paramIndex++}`);
      values.push(dto.remainingDays);
    }
    if (dto.status !== undefined) {
      setClauses.push(`status = $${paramIndex++}`);
      values.push(dto.status);
    }

    if (setClauses.length === 0) {
      return this.findById(id);
    }

    setClauses.push(`updated_at = NOW()`);
    values.push(id);

    const result = await this.db.query<LeaveBalanceRow>(
      `UPDATE leave_balances SET ${setClauses.join(', ')} WHERE id = $${paramIndex}
       RETURNING ${COLUMNS}`,
      values,
    );

    if (result.rows.length === 0) {
      return null;
    }
    return rowToLeaveBalance(result.rows[0]);
  }

  async createBatch(dtos: CreateLeaveBalanceDto[]): Promise<LeaveBalance[]> {
    if (dtos.length === 0) {
      return [];
    }

    const valuePlaceholders: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    for (const dto of dtos) {
      valuePlaceholders.push(
        `($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`,
      );
      values.push(
        dto.employeeId,
        dto.policyId,
        dto.totalEntitlement,
        dto.usedDays ?? 0,
        dto.pendingDays ?? 0,
        dto.remainingDays ?? dto.totalEntitlement,
        dto.fiscalYear,
        dto.status ?? 'ACTIVE',
      );
    }

    const result = await this.db.query<LeaveBalanceRow>(
      `INSERT INTO leave_balances (employee_id, policy_id, total_entitlement, used_days, pending_days, remaining_days, fiscal_year, status, created_at, updated_at)
       VALUES ${valuePlaceholders.join(', ')}
       RETURNING ${COLUMNS}`,
      values,
    );
    return result.rows.map(rowToLeaveBalance);
  }

  private async findById(id: string): Promise<LeaveBalance | null> {
    const result = await this.db.query<LeaveBalanceRow>(
      `SELECT ${COLUMNS} FROM leave_balances WHERE id = $1`,
      [id],
    );
    if (result.rows.length === 0) {
      return null;
    }
    return rowToLeaveBalance(result.rows[0]);
  }
}
