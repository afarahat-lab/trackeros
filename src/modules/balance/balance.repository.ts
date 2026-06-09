import * as db from '../../shared/db';
import {
  BalanceAdjustmentDto,
  CreateOrUpdateLeaveBalanceDto,
  LeaveBalance,
  LeaveType,
} from './balance.model';

interface QueryResult<T> {
  rows: T[];
}

interface DatabaseAdapter {
  query<T = unknown>(text: string, params?: unknown[]): Promise<QueryResult<T>>;
}

interface LeaveBalanceRow {
  employee_id: string;
  leave_type: LeaveType;
  total_days: number | string;
  used_days: number | string;
  pending_days: number | string;
  year: number | string;
  created_at?: Date | string | null;
  updated_at?: Date | string | null;
}

export interface IBalanceRepository {
  getByEmployeeAndType(
    employeeId: string,
    leaveType: LeaveType,
    year: number
  ): Promise<LeaveBalance | null>;

  listByEmployee(employeeId: string, year?: number): Promise<LeaveBalance[]>;

  upsertBalance(dto: CreateOrUpdateLeaveBalanceDto): Promise<LeaveBalance>;

  adjustPending(dto: BalanceAdjustmentDto): Promise<LeaveBalance>;

  adjustUsed(dto: BalanceAdjustmentDto): Promise<LeaveBalance>;

  resetPeriod(dto: CreateOrUpdateLeaveBalanceDto): Promise<LeaveBalance>;
}

const database = db as unknown as DatabaseAdapter;

function mapLeaveBalanceRow(row: LeaveBalanceRow): LeaveBalance {
  return {
    employeeId: row.employee_id,
    leaveType: row.leave_type,
    totalDays: Number(row.total_days),
    usedDays: Number(row.used_days),
    pendingDays: Number(row.pending_days),
    year: Number(row.year),
    createdAt: row.created_at ? new Date(row.created_at) : undefined,
    updatedAt: row.updated_at ? new Date(row.updated_at) : undefined,
  };
}

export class BalanceRepository implements IBalanceRepository {
  async getByEmployeeAndType(
    employeeId: string,
    leaveType: LeaveType,
    year: number
  ): Promise<LeaveBalance | null> {
    const result = await database.query<LeaveBalanceRow>(
      `
        SELECT
          employee_id,
          leave_type,
          total_days,
          used_days,
          pending_days,
          year,
          created_at,
          updated_at
        FROM leave_balances
        WHERE employee_id = $1
          AND leave_type = $2
          AND year = $3
        LIMIT 1
      `,
      [employeeId, leaveType, year]
    );

    const row = result.rows[0];

    return row ? mapLeaveBalanceRow(row) : null;
  }

  async listByEmployee(employeeId: string, year?: number): Promise<LeaveBalance[]> {
    const params: unknown[] = [employeeId];

    if (year !== undefined) {
      params.push(year);
    }

    const result = await database.query<LeaveBalanceRow>(
      `
        SELECT
          employee_id,
          leave_type,
          total_days,
          used_days,
          pending_days,
          year,
          created_at,
          updated_at
        FROM leave_balances
        WHERE employee_id = $1
        ${year !== undefined ? 'AND year = $2' : ''}
        ORDER BY year DESC, leave_type ASC
      `,
      params
    );

    return result.rows.map(mapLeaveBalanceRow);
  }

  async upsertBalance(dto: CreateOrUpdateLeaveBalanceDto): Promise<LeaveBalance> {
    const result = await database.query<LeaveBalanceRow>(
      `
        INSERT INTO leave_balances (
          employee_id,
          leave_type,
          total_days,
          used_days,
          pending_days,
          year
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (employee_id, leave_type, year)
        DO UPDATE SET
          total_days = EXCLUDED.total_days,
          used_days = EXCLUDED.used_days,
          pending_days = EXCLUDED.pending_days,
          updated_at = NOW()
        RETURNING
          employee_id,
          leave_type,
          total_days,
          used_days,
          pending_days,
          year,
          created_at,
          updated_at
      `,
      [
        dto.employeeId,
        dto.leaveType,
        dto.totalDays,
        dto.usedDays ?? 0,
        dto.pendingDays ?? 0,
        dto.year,
      ]
    );

    return mapLeaveBalanceRow(result.rows[0]);
  }

  async adjustPending(dto: BalanceAdjustmentDto): Promise<LeaveBalance> {
    const result = await database.query<LeaveBalanceRow>(
      `
        UPDATE leave_balances
        SET
          pending_days = pending_days + $4,
          updated_at = NOW()
        WHERE employee_id = $1
          AND leave_type = $2
          AND year = $3
        RETURNING
          employee_id,
          leave_type,
          total_days,
          used_days,
          pending_days,
          year,
          created_at,
          updated_at
      `,
      [dto.employeeId, dto.leaveType, dto.year, dto.days]
    );

    return mapLeaveBalanceRow(result.rows[0]);
  }

  async adjustUsed(dto: BalanceAdjustmentDto): Promise<LeaveBalance> {
    const result = await database.query<LeaveBalanceRow>(
      `
        UPDATE leave_balances
        SET
          used_days = used_days + $4,
          updated_at = NOW()
        WHERE employee_id = $1
          AND leave_type = $2
          AND year = $3
        RETURNING
          employee_id,
          leave_type,
          total_days,
          used_days,
          pending_days,
          year,
          created_at,
          updated_at
      `,
      [dto.employeeId, dto.leaveType, dto.year, dto.days]
    );

    return mapLeaveBalanceRow(result.rows[0]);
  }

  async resetPeriod(dto: CreateOrUpdateLeaveBalanceDto): Promise<LeaveBalance> {
    const result = await database.query<LeaveBalanceRow>(
      `
        UPDATE leave_balances
        SET
          total_days = $4,
          used_days = $5,
          pending_days = $6,
          updated_at = NOW()
        WHERE employee_id = $1
          AND leave_type = $2
          AND year = $3
        RETURNING
          employee_id,
          leave_type,
          total_days,
          used_days,
          pending_days,
          year,
          created_at,
          updated_at
      `,
      [
        dto.employeeId,
        dto.leaveType,
        dto.year,
        dto.totalDays,
        dto.usedDays ?? 0,
        dto.pendingDays ?? 0,
      ]
    );

    return mapLeaveBalanceRow(result.rows[0]);
  }
}
