import knex, { Knex } from 'knex';
import { pool } from '../../shared/db/connection';
import { IBaseRepository } from '../../shared/base-repository';
import { LeaveRequest } from './leave.model';

export interface ILeaveRepository extends IBaseRepository<LeaveRequest> {
  findByEmployeeId(employeeId: string): Promise<LeaveRequest[]>;
  findByStatus(status: string): Promise<LeaveRequest[]>;
}

const TABLE_NAME = 'leave_requests';

export class KnexLeaveRepository implements ILeaveRepository {
  private readonly db: Knex;

  constructor(db?: Knex) {
    this.db = db ?? knex({ client: 'pg', pool: pool as Knex.PoolConfig });
  }

  async findById(id: string): Promise<LeaveRequest | null> {
    const row = await this.db(TABLE_NAME).where({ id }).first();
    return row ? this.toLeaveRequest(row) : null;
  }

  async findAll(): Promise<LeaveRequest[]> {
    const rows = await this.db(TABLE_NAME).select('*');
    return rows.map((row) => this.toLeaveRequest(row));
  }

  async findByEmployeeId(employeeId: string): Promise<LeaveRequest[]> {
    const rows = await this.db(TABLE_NAME).where({ employeeId }).select('*');
    return rows.map((row) => this.toLeaveRequest(row));
  }

  async findByStatus(status: string): Promise<LeaveRequest[]> {
    const rows = await this.db(TABLE_NAME).where({ status }).select('*');
    return rows.map((row) => this.toLeaveRequest(row));
  }

  async create(entity: Omit<LeaveRequest, 'id'>): Promise<LeaveRequest> {
    const [row] = await this.db(TABLE_NAME).insert(entity).returning('*');
    return this.toLeaveRequest(row);
  }

  async update(id: string, entity: Partial<LeaveRequest>): Promise<LeaveRequest | null> {
    const [row] = await this.db(TABLE_NAME)
      .where({ id })
      .update({ ...entity, updatedAt: new Date() })
      .returning('*');
    return row ? this.toLeaveRequest(row) : null;
  }

  async delete(id: string): Promise<boolean> {
    const count = await this.db(TABLE_NAME).where({ id }).delete();
    return count > 0;
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
