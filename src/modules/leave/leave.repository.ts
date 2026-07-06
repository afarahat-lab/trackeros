
import { Pool } from 'pg';
import { pool } from '../../shared/db/connection';
import { LeaveStatus } from '../../shared/types/leave.types';
import {
  LeaveRequest,
  CreateLeaveRequestDto,
  UpdateLeaveRequestDto,
  LeaveRequestQueryParams,
} from './leave.model';

export interface ILeaveRepository {
  findById(id: number): Promise<LeaveRequest | null>;
  findByEmployeeId(employeeId: number): Promise<LeaveRequest[]>;
  findByStatus(status: LeaveStatus): Promise<LeaveRequest[]>;
  findByDateRange(startDate: Date, endDate: Date): Promise<LeaveRequest[]>;
  findPendingForManager(managerId: number): Promise<LeaveRequest[]>;
  create(dto: CreateLeaveRequestDto): Promise<LeaveRequest>;
  update(id: number, dto: UpdateLeaveRequestDto): Promise<LeaveRequest | null>;
  updateStatus(
    id: number,
    status: LeaveStatus,
    updatedBy: number,
    reason?: string
  ): Promise<LeaveRequest | null>;
}

export class LeaveRepository implements ILeaveRepository {
  private readonly db: Pool;

  constructor(dbPool: Pool = pool) {
    this.db = dbPool;
  }

  async findById(id: number): Promise<LeaveRequest | null> {
    const result = await this.db.query<LeaveRequest>(
      'SELECT * FROM leave_requests WHERE id = $1',
      [id]
    );
    return result.rows[0] ?? null;
  }

  async findByEmployeeId(employeeId: number): Promise<LeaveRequest[]> {
    const result = await this.db.query<LeaveRequest>(
      'SELECT * FROM leave_requests WHERE employee_id = $1 ORDER BY created_at DESC',
      [employeeId]
    );
    return result.rows;
  }

  async findByStatus(status: LeaveStatus): Promise<LeaveRequest[]> {
    const result = await this.db.query<LeaveRequest>(
      'SELECT * FROM leave_requests WHERE status = $1 ORDER BY created_at DESC',
      [status]
    );
    return result.rows;
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<LeaveRequest[]> {
    const result = await this.db.query<LeaveRequest>(
      `SELECT * FROM leave_requests
       WHERE start_date <= $2 AND end_date >= $1
       ORDER BY start_date ASC`,
      [startDate, endDate]
    );
    return result.rows;
  }

  async findPendingForManager(managerId: number): Promise<LeaveRequest[]> {
    const result = await this.db.query<LeaveRequest>(
      `SELECT lr.* FROM leave_requests lr
       INNER JOIN employees e ON lr.employee_id = e.id
       WHERE e.manager_id = $1 AND lr.status = $2
       ORDER BY lr.created_at ASC`,
      [managerId, LeaveStatus.PENDING]
    );
    return result.rows;
  }

  async create(dto: CreateLeaveRequestDto): Promise<LeaveRequest> {
    const result = await this.db.query<LeaveRequest>(
      `INSERT INTO leave_requests (
        employee_id, leave_type_id, start_date, end_date, reason, status
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [
        dto.employeeId,
        dto.leaveTypeId,
        dto.startDate,
        dto.endDate,
        dto.reason,
        LeaveStatus.PENDING,
      ]
    );
    return result.rows[0];
  }

  async update(id: number, dto: UpdateLeaveRequestDto): Promise<LeaveRequest | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    const fieldMap: Array<[keyof UpdateLeaveRequestDto, string]> = [
      ['startDate', 'start_date'],
      ['endDate', 'end_date'],
      ['reason', 'reason'],
    ];

    for (const [key, column] of fieldMap) {
      if (dto[key] !== undefined) {
        fields.push(`${column} = $${paramIndex}`);
        values.push(dto[key]);
        paramIndex++;
      }
    }

    if (fields.length === 0) {
      return null;
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await this.db.query<LeaveRequest>(
      `UPDATE leave_requests SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    return result.rows[0] ?? null;
  }

  async updateStatus(
    id: number,
    status: LeaveStatus,
    updatedBy: number,
    reason?: string
  ): Promise<LeaveRequest | null> {
    const now = new Date();
    let query: string;
    const values: unknown[] = [id, status];

    switch (status) {
      case LeaveStatus.APPROVED:
        query = `UPDATE leave_requests
          SET status = $2, approved_by = $3, approved_at = $4, updated_at = $4
          WHERE id = $1
          RETURNING *`;
        values.push(updatedBy, now);
        break;
      case LeaveStatus.REJECTED:
        query = `UPDATE leave_requests
          SET status = $2, rejected_by = $3, rejected_at = $4, rejection_reason = $5, updated_at = $4
          WHERE id = $1
          RETURNING *`;
        values.push(updatedBy, now, reason ?? null);
        break;
      case LeaveStatus.CANCELLED:
        query = `UPDATE leave_requests
          SET status = $2, cancelled_by = $3, cancelled_at = $4, cancellation_reason = $5, updated_at = $4
          WHERE id = $1
          RETURNING *`;
        values.push(updatedBy, now, reason ?? null);
        break;
      default:
        query = `UPDATE leave_requests
          SET status = $2, updated_at = NOW()
          WHERE id = $1
          RETURNING *`;
    }

    const result = await this.db.query<LeaveRequest>(query, values);
    return result.rows[0] ?? null;
  }
}
