import { Knex, knex } from 'knex';
import { pool } from '../../shared/db/connection';
import {
  LeaveRequest,
  CreateLeaveRequestDto,
  UpdateLeaveRequestDto,
  LeaveRequestQueryParams,
} from './leave.model';

export interface ILeaveRepository {
  findById(id: string): Promise<LeaveRequest | null>;
  findByEmployeeId(
    employeeId: string,
    params: LeaveRequestQueryParams,
  ): Promise<LeaveRequest[]>;
  create(dto: CreateLeaveRequestDto): Promise<LeaveRequest>;
  update(id: string, dto: UpdateLeaveRequestDto): Promise<LeaveRequest | null>;
  delete(id: string): Promise<void>;
  findAll(params: LeaveRequestQueryParams): Promise<LeaveRequest[]>;
}

export class KnexLeaveRepository implements ILeaveRepository {
  private readonly db: Knex;

  constructor() {
    this.db = knex({ client: 'pg', pool });
  }

  async findById(id: string): Promise<LeaveRequest | null> {
    const row = await this.db('leave_request').where({ id }).first();
    return row ? this.toLeaveRequest(row) : null;
  }

  async findByEmployeeId(
    employeeId: string,
    params: LeaveRequestQueryParams,
  ): Promise<LeaveRequest[]> {
    let query = this.db('leave_request').where({ employee_id: employeeId });
    query = this.applyQueryParams(query, params);
    const rows = await query;
    return rows.map((row) => this.toLeaveRequest(row));
  }

  async create(dto: CreateLeaveRequestDto): Promise<LeaveRequest> {
    const now = new Date().toISOString();
    const [row] = await this.db('leave_request')
      .insert({
        employee_id: dto.employeeId,
        leave_type_id: dto.leaveTypeId,
        start_date: dto.startDate,
        end_date: dto.endDate,
        reason: dto.reason,
        status: 'DRAFT',
        days_requested: 0,
        created_at: now,
        updated_at: now,
      })
      .returning('*');
    return this.toLeaveRequest(row);
  }

  async update(
    id: string,
    dto: UpdateLeaveRequestDto,
  ): Promise<LeaveRequest | null> {
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (dto.startDate !== undefined) {
      updates.start_date = dto.startDate;
    }
    if (dto.endDate !== undefined) {
      updates.end_date = dto.endDate;
    }
    if (dto.reason !== undefined) {
      updates.reason = dto.reason;
    }
    const [row] = await this.db('leave_request')
      .where({ id })
      .update(updates)
      .returning('*');
    return row ? this.toLeaveRequest(row) : null;
  }

  async delete(id: string): Promise<void> {
    await this.db('leave_request').where({ id }).del();
  }

  async findAll(params: LeaveRequestQueryParams): Promise<LeaveRequest[]> {
    let query = this.db('leave_request');
    query = this.applyQueryParams(query, params);
    const rows = await query;
    return rows.map((row) => this.toLeaveRequest(row));
  }

  private applyQueryParams(
    query: Knex.QueryBuilder,
    params: LeaveRequestQueryParams,
  ): Knex.QueryBuilder {
    if (params.status) {
      query = query.where({ status: params.status });
    }
    if (params.leaveTypeId) {
      query = query.where({ leave_type_id: params.leaveTypeId });
    }
    if (params.startDateFrom) {
      query = query.where('start_date', '>=', params.startDateFrom);
    }
    if (params.startDateTo) {
      query = query.where('start_date', '<=', params.startDateTo);
    }
    if (params.endDateFrom) {
      query = query.where('end_date', '>=', params.endDateFrom);
    }
    if (params.endDateTo) {
      query = query.where('end_date', '<=', params.endDateTo);
    }
    if (params.limit) {
      query = query.limit(params.limit);
    }
    if (params.offset) {
      query = query.offset(params.offset);
    }
    return query;
  }

  private toLeaveRequest(row: Record<string, unknown>): LeaveRequest {
    return {
      id: row.id as string,
      employeeId: row.employee_id as string,
      leaveTypeId: row.leave_type_id as string,
      startDate: row.start_date as string,
      endDate: row.end_date as string,
      daysRequested: row.days_requested as number,
      reason: row.reason as string,
      status: row.status as LeaveRequest['status'],
      approvedBy: (row.approved_by as string) ?? null,
      approvedAt: (row.approved_at as string) ?? null,
      rejectedBy: (row.rejected_by as string) ?? null,
      rejectedAt: (row.rejected_at as string) ?? null,
      rejectionReason: (row.rejection_reason as string) ?? null,
      cancelledBy: (row.cancelled_by as string) ?? null,
      cancelledAt: (row.cancelled_at as string) ?? null,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }
}
