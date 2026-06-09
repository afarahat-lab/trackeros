import * as db from '../../shared/db';
import {
  BalanceAdjustmentDto,
  CreateOrUpdateLeaveBalanceDto,
  LeaveBalance,
  LeaveType,
} from './balance.model';

interface QueryResult<Row> {
  rows: Row[];
}

interface DatabaseAdapter {
  query<Row = unknown>(sql: string, params?: unknown[]): Promise<QueryResult<Row>>;
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

export interface IBalanceRepository {
  getByEmployeeAndType(employeeId: string, leaveType: LeaveType): Promise<LeaveBalance | null>;
  listByEmployee(employeeId: string): Promise<LeaveBalance[]>;
  upsertBalance(dto: CreateOrUpdateLeaveBalanceDto): Promise<LeaveBalance>;
  adjustPending(dto: BalanceAdjustmentDto): Promise<LeaveBalance>;
  adjustUsed(dto: BalanceAdjustmentDto): Promise<LeaveBalance>;
  resetPeriod(dto: CreateOrUpdateLeaveBalanceDto): Promise<LeaveBalance>;
}

const database = db as unknown as DatabaseAdapter;

export class BalanceRepository implements IBalanceRepository {
  async getByEmployeeAndType(employeeId: string, leaveType: LeaveType): Promise<LeaveBalance | null> {
    const result = await database.query<LeaveBalanceRow>(
      `
        SELECT employee_id, leave_type, entitlement, pending, used, period_start, period_end
        FROM leave_balances
        WHERE employee_id = $1 AND leave_type = $2
        ORDER BY period_start DESC
        LIMIT 1
      `,
      [employeeId, leaveType],
    );

    const row = result.rows[0];

    return row ? this.toLeaveBalance(row) : null;
  }

  async listByEmployee(employeeId: string): Promise<LeaveBalance[]> {
    const result = await database.query<LeaveBalanceRow>(
      `
        SELECT employee_id, leave_type, entitlement, pending, used, period_start, period_end
        FROM leave_balances
        WHERE employee_id = $1
        ORDER BY leave_type ASC, period_start DESC
      `,
      [employeeId],
    );

    return result.rows.map((row) => this.toLeaveBalance(row));
  }

  async upsertBalance(dto: CreateOrUpdateLeaveBalanceDto): Promise<LeaveBalance> {
    const pending = dto.pending ?? 0;
    const used = dto.used ?? 0;

    const result = await database.query<LeaveBalanceRow>(
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
        ON CONFLICT (employee_id, leave_type, period_start)
        DO UPDATE SET
          entitlement = EXCLUDED.entitlement,
          pending = EXCLUDED.pending,
          used = EXCLUDED.used,
          period_end = EXCLUDED.period_end
        RETURNING employee_id, leave_type, entitlement, pending, used, period_start, period_end
      `,
      [
        dto.employeeId,
        dto.leaveType,
        dto.entitlement,
        pending,
        used,
        dto.periodStart,
        dto.periodEnd,
      ],
    );

    return this.requireBalance(result.rows[0], 'Unable to upsert leave balance');
  }

  async adjustPending(dto: BalanceAdjustmentDto): Promise<LeaveBalance> {
    const result = await database.query<LeaveBalanceRow>(
      `
        WITH selected_balance AS (
          SELECT ctid
          FROM leave_balances
          WHERE employee_id = $1 AND leave_type = $2
          ORDER BY period_start DESC
          LIMIT 1
        )
        UPDATE leave_balances
        SET pending = pending + $3
        FROM selected_balance
        WHERE leave_balances.ctid = selected_balance.ctid
        RETURNING employee_id, leave_type, entitlement, pending, used, period_start, period_end
      `,
      [dto.employeeId, dto.leaveType, dto.amount],
    );

    return this.requireBalance(result.rows[0], 'Unable to adjust pending leave balance');
  }

  async adjustUsed(dto: BalanceAdjustmentDto): Promise<LeaveBalance> {
    const result = await database.query<LeaveBalanceRow>(
      `
        WITH selected_balance AS (
          SELECT ctid
          FROM leave_balances
          WHERE employee_id = $1 AND leave_type = $2
          ORDER BY period_start DESC
          LIMIT 1
        )
        UPDATE leave_balances
        SET used = used + $3
        FROM selected_balance
        WHERE leave_balances.ctid = selected_balance.ctid
        RETURNING employee_id, leave_type, entitlement, pending, used, period_start, period_end
      `,
      [dto.employeeId, dto.leaveType, dto.amount],
    );

    return this.requireBalance(result.rows[0], 'Unable to adjust used leave balance');
  }

  async resetPeriod(dto: CreateOrUpdateLeaveBalanceDto): Promise<LeaveBalance> {
    const result = await database.query<LeaveBalanceRow>(
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
        ON CONFLICT (employee_id, leave_type, period_start)
        DO UPDATE SET
          entitlement = EXCLUDED.entitlement,
          pending = 0,
          used = 0,
          period_end = EXCLUDED.period_end
        RETURNING employee_id, leave_type, entitlement, pending, used, period_start, period_end
      `,
      [dto.employeeId, dto.leaveType, dto.entitlement, dto.periodStart, dto.periodEnd],
    );

    return this.requireBalance(result.rows[0], 'Unable to reset leave balance period');
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
