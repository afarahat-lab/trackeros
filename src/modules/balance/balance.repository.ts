
import { PoolClient } from 'pg';
import { IBaseRepository, BaseRepository } from 'shared/base-repository';
import { LeaveBalance } from './balance.model';

export interface ILeaveBalanceRepository extends IBaseRepository<LeaveBalance> {
  findByEmployeeId(employeeId: string, client?: PoolClient): Promise<LeaveBalance[]>;
  findByEmployeeAndPolicy(
    employeeId: string,
    leavePolicyId: string,
    client?: PoolClient,
  ): Promise<LeaveBalance | null>;
  findByEmployeeAndFiscalYear(
    employeeId: string,
    fiscalYear: number,
    client?: PoolClient,
  ): Promise<LeaveBalance[]>;
  findActiveByEmployee(employeeId: string, client?: PoolClient): Promise<LeaveBalance[]>;
  upsert(
    balance: Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt'>,
    client?: PoolClient,
  ): Promise<LeaveBalance>;
}

export class LeaveBalanceRepository
  extends BaseRepository<LeaveBalance>
  implements ILeaveBalanceRepository
{
  protected readonly tableName = 'leave_balances';

  async findByEmployeeId(employeeId: string, client?: PoolClient): Promise<LeaveBalance[]> {
    const executor = client ?? this.pool;
    const result = await executor.query(
      `SELECT * FROM ${this.tableName} WHERE employee_id = $1`,
      [employeeId],
    );
    return result.rows;
  }

  async findByEmployeeAndPolicy(
    employeeId: string,
    leavePolicyId: string,
    client?: PoolClient,
  ): Promise<LeaveBalance | null> {
    const executor = client ?? this.pool;
    const result = await executor.query(
      `SELECT * FROM ${this.tableName} WHERE employee_id = $1 AND leave_policy_id = $2`,
      [employeeId, leavePolicyId],
    );
    return result.rows[0] ?? null;
  }

  async findByEmployeeAndFiscalYear(
    employeeId: string,
    fiscalYear: number,
    client?: PoolClient,
  ): Promise<LeaveBalance[]> {
    const executor = client ?? this.pool;
    const result = await executor.query(
      `SELECT * FROM ${this.tableName} WHERE employee_id = $1 AND fiscal_year = $2`,
      [employeeId, fiscalYear],
    );
    return result.rows;
  }

  async findActiveByEmployee(employeeId: string, client?: PoolClient): Promise<LeaveBalance[]> {
    const executor = client ?? this.pool;
    const result = await executor.query(
      `SELECT * FROM ${this.tableName} WHERE employee_id = $1 AND status = 'ACTIVE'`,
      [employeeId],
    );
    return result.rows;
  }

  async upsert(
    balance: Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt'>,
    client?: PoolClient,
  ): Promise<LeaveBalance> {
    const executor = client ?? this.pool;
    const result = await executor.query(
      `INSERT INTO ${this.tableName} (employee_id, leave_policy_id, total_entitlement, used_days, remaining_days, fiscal_year, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (employee_id, leave_policy_id, fiscal_year)
       DO UPDATE SET
         total_entitlement = EXCLUDED.total_entitlement,
         used_days = EXCLUDED.used_days,
         remaining_days = EXCLUDED.remaining_days,
         status = EXCLUDED.status,
         updated_at = NOW()
       RETURNING *`,
      [
        balance.employeeId,
        balance.leavePolicyId,
        balance.totalEntitlement,
        balance.usedDays,
        balance.remainingDays,
        balance.fiscalYear,
        balance.status,
      ],
    );
    return result.rows[0];
  }
}
