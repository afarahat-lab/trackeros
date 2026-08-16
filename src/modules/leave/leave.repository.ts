import { Pool, PoolClient } from 'pg';
import { pool } from '../../shared/db/connection';
import { LeaveRequest } from './leave.model';
import { LeaveRequestStatus } from '../../shared/types/leave-request-status.enum';

export interface ILeaveRepository {
  findById(id: string): Promise<LeaveRequest | null>;
  findByEmployee(employeeId: string): Promise<LeaveRequest[]>;
  findByEmployeeAndStatus(employeeId: string, status: LeaveRequestStatus): Promise<LeaveRequest[]>;
  findOverlapping(
    employeeId: string,
    startDate: Date,
    endDate: Date,
    excludeId?: string,
  ): Promise<LeaveRequest[]>;
  create(
    request: Omit<LeaveRequest, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<LeaveRequest>;
  update(id: string, data: Partial<LeaveRequest>): Promise<LeaveRequest | null>;
  findPendingByEmployee(employeeId: string): Promise<LeaveRequest[]>;
}

function rowToLeaveRequest(row: Record<string, unknown>): LeaveRequest {
  return {
    id: row.id as string,
    employeeId: row.employee_id as string,
    leavePolicyId: row.leave_policy_id as string,
    startDate: new Date(row.start_date as string),
    endDate: new Date(row.end_date as string),
    reason: row.reason != null ? (row.reason as string) : undefined,
    status: row.status as LeaveRequestStatus,
    approvedBy: row.approved_by as string | null,
    approvedAt: row.approved_at ? new Date(row.approved_at as string) : null,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };
}

export class LeaveRepository implements ILeaveRepository {
  private readonly db: Pool | PoolClient;

  constructor(client?: Pool | PoolClient) {
    this.db = client ?? pool;
  }

  async findById(id: string): Promise<LeaveRequest | null> {
    const result = await this.db.query(
      'SELECT * FROM leave_requests WHERE id = $1',
      [id],
    );
    if (result.rows.length === 0) {
      return null;
    }
    return rowToLeaveRequest(result.rows[0]);
  }

  async findByEmployee(employeeId: string): Promise<LeaveRequest[]> {
    const result = await this.db.query(
      'SELECT * FROM leave_requests WHERE employee_id = $1 ORDER BY start_date DESC',
      [employeeId],
    );
    return result.rows.map(rowToLeaveRequest);
  }

  async findByEmployeeAndStatus(
    employeeId: string,
    status: LeaveRequestStatus,
  ): Promise<LeaveRequest[]> {
    const result = await this.db.query(
      'SELECT * FROM leave_requests WHERE employee_id = $1 AND status = $2 ORDER BY start_date DESC',
      [employeeId, status],
    );
    return result.rows.map(rowToLeaveRequest);
  }

  async findOverlapping(
    employeeId: string,
    startDate: Date,
    endDate: Date,
    excludeId?: string,
  ): Promise<LeaveRequest[]> {
    const params: unknown[] = [employeeId, startDate, endDate];
    let query =
      'SELECT * FROM leave_requests WHERE employee_id = $1 AND status IN (\'SUBMITTED\', \'APPROVED\') AND start_date <= $3 AND end_date >= $2';

    if (excludeId) {
      params.push(excludeId);
      query += ` AND id != $${params.length}`;
    }

    query += ' ORDER BY start_date';

    const result = await this.db.query(query, params);
    return result.rows.map(rowToLeaveRequest);
  }

  async create(
    request: Omit<LeaveRequest, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<LeaveRequest> {
    const now = new Date();
    const result = await this.db.query(
      `INSERT INTO leave_requests (
        employee_id, leave_policy_id, start_date, end_date,
        reason, status, approved_by, approved_at, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        request.employeeId,
        request.leavePolicyId,
        request.startDate,
        request.endDate,
        request.reason ?? null,
        request.status,
        request.approvedBy ?? null,
        request.approvedAt ?? null,
        now,
        now,
      ],
    );
    return rowToLeaveRequest(result.rows[0]);
  }

  async update(id: string, data: Partial<LeaveRequest>): Promise<LeaveRequest | null> {
    const existing = await this.findById(id);
    if (!existing) {
      return null;
    }

    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    const fieldMap: Array<{ key: keyof LeaveRequest; column: string }> = [
      { key: 'startDate', column: 'start_date' },
      { key: 'endDate', column: 'end_date' },
      { key: 'reason', column: 'reason' },
      { key: 'status', column: 'status' },
      { key: 'approvedBy', column: 'approved_by' },
      { key: 'approvedAt', column: 'approved_at' },
    ];

    for (const { key, column } of fieldMap) {
      if (key in data) {
        fields.push(`${column} = $${paramIndex}`);
        values.push(data[key] ?? null);
        paramIndex++;
      }
    }

    if (fields.length === 0) {
      return existing;
    }

    fields.push(`updated_at = $${paramIndex}`);
    values.push(new Date());
    paramIndex++;

    values.push(id);

    const result = await this.db.query(
      `UPDATE leave_requests SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values,
    );

    if (result.rows.length === 0) {
      return null;
    }
    return rowToLeaveRequest(result.rows[0]);
  }

  async findPendingByEmployee(employeeId: string): Promise<LeaveRequest[]> {
    const result = await this.db.query(
      'SELECT * FROM leave_requests WHERE employee_id = $1 AND status = \'SUBMITTED\' ORDER BY start_date DESC',
      [employeeId],
    );
    return result.rows.map(rowToLeaveRequest);
  }
}
