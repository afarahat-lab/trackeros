import knex, { Knex } from 'knex';
import { pool } from '../../shared/db/connection';
import { IBaseRepository } from '../../shared/base-repository';
import { LeaveRequest } from './leave.model';

export interface ILeaveRepository extends IBaseRepository<LeaveRequest> {
  findByEmployeeId(employeeId: string): Promise<LeaveRequest[]>;
  findByStatus(status: string): Promise<LeaveRequest[]>;
}

const TABLE_NAME = 'leave_requests';

export class RepositoryError extends Error {
  constructor(
    message: string,
    public readonly originalError?: unknown,
  ) {
    super(message);
    this.name = 'RepositoryError';
  }
}

export class KnexLeaveRepository implements ILeaveRepository {
  private readonly db: Knex;

  constructor(db?: Knex) {
    this.db = db ?? knex({ client: 'pg', pool: pool as Knex.PoolConfig });
  }

  async findById(id: string): Promise<LeaveRequest | null> {
    try {
      const row = await this.db(TABLE_NAME).where({ id }).first();
      return row ? this.toLeaveRequest(row) : null;
    } catch (error) {
      throw new RepositoryError(
        `Failed to find leave request by id: ${id}`,
        error,
      );
    }
  }

  async findAll(): Promise<LeaveRequest[]> {
    try {
      const rows = await this.db(TABLE_NAME).select('*');
      return rows.map((row) => this.toLeaveRequest(row));
    } catch (error) {
      throw new RepositoryError('Failed to find all leave requests', error);
    }
  }

  async findByEmployeeId(employeeId: string): Promise<LeaveRequest[]> {
    try {
      const rows = await this.db(TABLE_NAME).where({ employeeId }).select('*');
      return rows.map((row) => this.toLeaveRequest(row));
    } catch (error) {
      throw new RepositoryError(
        `Failed to find leave requests by employee id: ${employeeId}`,
        error,
      );
    }
  }

  async findByStatus(status: string): Promise<LeaveRequest[]> {
    try {
      const rows = await this.db(TABLE_NAME).where({ status }).select('*');
      return rows.map((row) => this.toLeaveRequest(row));
    } catch (error) {
      throw new RepositoryError(
        `Failed to find leave requests by status: ${status}`,
        error,
      );
    }
  }

  async create(entity: Omit<LeaveRequest, 'id'>): Promise<LeaveRequest> {
    try {
      const [row] = await this.db(TABLE_NAME).insert(entity).returning('*');
      return this.toLeaveRequest(row);
    } catch (error) {
      throw new RepositoryError('Failed to create leave request', error);
    }
  }

  async update(id: string, entity: Partial<LeaveRequest>): Promise<LeaveRequest | null> {
    try {
      const [row] = await this.db(TABLE_NAME)
        .where({ id })
        .update({ ...entity, updatedAt: new Date() })
        .returning('*');
      return row ? this.toLeaveRequest(row) : null;
    } catch (error) {
      throw new RepositoryError(
        `Failed to update leave request: ${id}`,
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
        `Failed to delete leave request: ${id}`,
        error,
      );
    }
  }

  private toLeaveRequest(row: Record<string, unknown>): LeaveRequest {
    return {
      id: row.id as string,
      employeeId: row.employeeId as string,
      leaveType: row.leaveType as LeaveRequest['leaveType'],
      leavePolicyId: row.leavePolicyId as string,
      startDate: new Date(row.startDate as string),
      endDate: new Date(row.endDate as string),
      totalDays: row.totalDays as number,
      reason: row.reason as string,
      status: row.status as LeaveRequest['status'],
      managerId: (row.managerId as string) ?? null,
      managerComment: (row.managerComment as string) ?? null,
      submittedAt: row.submittedAt ? new Date(row.submittedAt as string) : null,
      reviewedAt: row.reviewedAt ? new Date(row.reviewedAt as string) : null,
      createdAt: new Date(row.createdAt as string),
      updatedAt: new Date(row.updatedAt as string),
    };
  }
}
