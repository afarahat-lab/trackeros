import * as database from '../../shared/db';
import {
  BalanceAdjustmentDto,
  CreateOrUpdateLeaveBalanceDto,
  LeaveBalance,
  LeaveType,
} from './balance.model';

interface QueryResult<T> {
  rows: T[];
}

interface QueryableDatabase {
  query<T>(sql: string, params?: unknown[]): Promise<QueryResult<T>>;
}

interface LeaveBalanceRow {
  employee_id: string;
  leave_type: LeaveType;
  entitlement: number | string;
  pending: number | string;
  used: number | string;
  period_start: Date | string;
  period_end: Date | string;
}

const db = database as unknown as QueryableDatabase;

export class BalanceRepository {
  async getByEmployeeAndType(
    employeeId: string,
    leaveType: LeaveType,
  ): Promise<LeaveBalance | null> {
    const result = await db.query<LeaveBalanceRow>(
      `
        SELECT
          employee_id,
          leave_type,
          entitlement,
          pending,
          used,
          period_start,
          period_end
        FROM leave_balances
        WHERE employee_id = $1
          AND leave_type = $2
      `,
      [employeeId, leaveType],
    );

    const row = result.rows[0];

    return row ? this.toLeaveBalance(row) : null;
  }

  async listByEmployee(employeeId: string): Promise<LeaveBalance[]> {
    const result = await db.query<LeaveBalanceRow>(
      `
        SELECT
          employee_id,
          leave_type,
          entitlement,
          pending,
          used,
          period_start,
          period_end
        FROM leave_balances
        WHERE employee_id = $1
        ORDER BY leave_type ASC
      `,
      [employeeId],
    );

    return result.rows.map((row) => this.toLeaveBalance(row));
  }

  async upsertBalance(dto: CreateOrUpdateLeaveBalanceDto): Promise<LeaveBalance> {
    const result = await db.query<LeaveBalanceRow>(
      `
        INSERT INTO leave_balances (
          employee_id,
          leave_type,
          entitlement,
          pending,
          used,
          period_start,
          period_end
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (employee_id, leave_type)
        DO UPDATE SET
          entitlement = EXCLUDED.entitlement,
          pending = EXCLUDED.pending,
          used = EXCLUDED.used,
          period_start = EXCLUDED.period_start,
          period_end = EXCLUDED.period_end
        RETURNING
          employee_id,
          leave_type,
          entitlement,
          pending,
          used,
          period_start,
          period_end
      `,
      [
        dto.employeeId,
        dto.leaveType,
        dto.entitlement,
        dto.pending ?? 0,
        dto.used ?? 0,
        dto.periodStart,
        dto.periodEnd,
      ],
    );

    return this.requireBalance(result.rows[0], 'Unable to upsert leave balance.');
  }

  async adjustPending(dto: BalanceAdjustmentDto): Promise<LeaveBalance> {
    const result = await db.query<LeaveBalanceRow>(
      `
        UPDATE leave_balances
        SET pending = pending + $3
        WHERE employee_id = $1
          AND leave_type = $2
        RETURNING
          employee_id,
          leave_type,
          entitlement,
          pending,
          used,
          period_start,
          period_end
      `,
      [dto.employeeId, dto.leaveType, dto.days],
    );

    return this.requireBalance(result.rows[0], 'Unable to adjust pending leave balance.');
  }

  async adjustUsed(dto: BalanceAdjustmentDto): Promise<LeaveBalance> {
    const result = await db.query<LeaveBalanceRow>(
      `
        UPDATE leave_balances
        SET used = used + $3
        WHERE employee_id = $1
          AND leave_type = $2
        RETURNING
          employee_id,
          leave_type,
          entitlement,
          pending,
          used,
          period_start,
          period_end
      `,
      [dto.employeeId, dto.leaveType, dto.days],
    );

    return this.requireBalance(result.rows[0], 'Unable to adjust used leave balance.');
  }

  async resetPeriod(dto: CreateOrUpdateLeaveBalanceDto): Promise<LeaveBalance> {
    const result = await db.query<LeaveBalanceRow>(
      `
        INSERT INTO leave_balances (
          employee_id,
          leave_type,
          entitlement,
          pending,
          used,
          period_start,
          period_end
        )
        VALUES ($1, $2, $3, 0, 0, $4, $5)
        ON CONFLICT (employee_id, leave_type)
        DO UPDATE SET
          entitlement = EXCLUDED.entitlement,
          pending = 0,
          used = 0,
          period_start = EXCLUDED.period_start,
          period_end = EXCLUDED.period_end
        RETURNING
          employee_id,
          leave_type,
          entitlement,
          pending,
          used,
          period_start,
          period_end
      `,
      [dto.employeeId, dto.leaveType, dto.entitlement, dto.periodStart, dto.periodEnd],
    );

    return this.requireBalance(result.rows[0], 'Unable to reset leave balance period.');
  }

  private requireBalance(row: LeaveBalanceRow | undefined, message: string): LeaveBalance {
    if (!row) {
      throw new Error(message);
    }

    return this.toLeaveBalance(row);
  }

  private toLeaveBalance(row: LeaveBalanceRow): LeaveBalance {
    return {
      employeeId: row.employee_id,
      leaveType: row.leave_type,
      entitlement: Number(row.entitlement),
      pending: Number(row.pending),
      used: Number(row.used),
      periodStart: new Date(row.period_start),
      periodEnd: new Date(row.period_end),
    };
  }
}

export const balanceRepository = new BalanceRepository();

export default balanceRepository;
