import knex, { Knex } from 'knex';
import { pool } from '../../shared/db/connection';
import { IBaseRepository } from '../../shared/base-repository';
import { LeaveBalance } from './balance.model';

export interface ILeaveBalanceRepository extends IBaseRepository<LeaveBalance> {
  findByEmployeeId(employeeId: string): Promise<LeaveBalance[]>;
  findByEmployeeIdAndYear(employeeId: string, year: number): Promise<LeaveBalance[]>;
  findByEmployeeIdAndLeaveType(employeeId: string, leaveType: string, year: number): Promise<LeaveBalance | null>;
  findByStatus(status: string): Promise<LeaveBalance[]>;
}

const TABLE_NAME = 'leave_balances';

export class RepositoryError extends Error {
  constructor(
    message: string,
    public readonly originalError?: unknown,
  ) {
    super(message);
    this.name = 'RepositoryError';
  }
}

export class KnexLeaveBalanceRepository implements ILeaveBalanceRepository {
  private readonly db: Knex;

  constructor(db?: Knex) {
    this.db = db ?? knex({ client: 'pg', pool: pool as Knex.PoolConfig });
  }

  async findById(id: string): Promise<LeaveBalance | null> {
    try {
      const row = await this.db(TABLE_NAME).where({ id }).first();
      return row ? this.toLeaveBalance(row) : null;
    } catch (error) {
      throw new RepositoryError(
        `Failed to find leave balance by id: ${id}`,
        error,
      );
    }
  }

  async findAll(): Promise<LeaveBalance[]> {
    try {
      const rows = await this.db(TABLE_NAME).select('*');
      return rows.map((row) => this.toLeaveBalance(row));
    } catch (error) {
      throw new RepositoryError('Failed to find all leave balances', error);
    }
  }

  async findByEmployeeId(employeeId: string): Promise<LeaveBalance[]> {
    try {
      const rows = await this.db(TABLE_NAME).where({ employeeId }).select('*');
      return rows.map((row) => this.toLeaveBalance(row));
    } catch (error) {
      throw new RepositoryError(
        `Failed to find leave balances by employee id: ${employeeId}`,
        error,
      );
    }
  }

  async findByEmployeeIdAndYear(employeeId: string, year: number): Promise<LeaveBalance[]> {
    try {
      const rows = await this.db(TABLE_NAME)
        .where({ employeeId, year })
        .select('*');
      return rows.map((row) => this.toLeaveBalance(row));
    } catch (error) {
      throw new RepositoryError(
        `Failed to find leave balances by employee id: ${employeeId} and year: ${year}`,
        error,
      );
    }
  }

  async findByEmployeeIdAndLeaveType(
    employeeId: string,
    leaveType: string,
    year: number,
  ): Promise<LeaveBalance | null> {
    try {
      const row = await this.db(TABLE_NAME)
        .where({ employeeId, leaveType, year })
        .first();
      return row ? this.toLeaveBalance(row) : null;
    } catch (error) {
      throw new RepositoryError(
        `Failed to find leave balance by employee id: ${employeeId}, leave type: ${leaveType}, year: ${year}`,
        error,
      );
    }
  }

  async findByStatus(status: string): Promise<LeaveBalance[]> {
    try {
      const rows = await this.db(TABLE_NAME).where({ status }).select('*');
      return rows.map((row) => this.toLeaveBalance(row));
    } catch (error) {
      throw new RepositoryError(
        `Failed to find leave balances by status: ${status}`,
        error,
      );
    }
  }

  async create(entity: Omit<LeaveBalance, 'id'>): Promise<LeaveBalance> {
    try {
      const [row] = await this.db(TABLE_NAME).insert(entity).returning('*');
      return this.toLeaveBalance(row);
    } catch (error) {
      throw new RepositoryError('Failed to create leave balance', error);
    }
  }

  async update(id: string, entity: Partial<LeaveBalance>): Promise<LeaveBalance | null> {
    try {
      const [row] = await this.db(TABLE_NAME)
        .where({ id })
        .update({ ...entity, updatedAt: new Date() })
        .returning('*');
      return row ? this.toLeaveBalance(row) : null;
    } catch (error) {
      throw new RepositoryError(
        `Failed to update leave balance: ${id}`,
        error,
      );
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const count = await this.db(TABLE_NAME).where({ id }).delete();
      return count > 0;
    } catch (error) {
      throw new RepositoryError(
        `Failed to delete leave balance: ${id}`,
        error,
      );
    }
  }

  private toLeaveBalance(row: Record<string, unknown>): LeaveBalance {
    return {
      id: row.id as string,
      employeeId: row.employeeId as string,
      leaveType: row.leaveType as LeaveBalance['leaveType'],
      leavePolicyId: row.leavePolicyId as string,
      entitled: row.entitled as number,
      used: row.used as number,
      pending: row.pending as number,
      carriedOver: row.carriedOver as number,
      remaining: row.remaining as number,
      year: row.year as number,
      status: row.status as LeaveBalance['status'],
      createdAt: new Date(row.createdAt as string),
      updatedAt: new Date(row.updatedAt as string),
    };
  }
}
