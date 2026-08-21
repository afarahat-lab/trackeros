import { randomUUID } from 'crypto';
import { pool } from '../../shared/db/connection';
import { LeaveStatus, LeaveType } from '../../shared/types';
import { ILeaveRequestRepository, LeaveRequest } from './leave-request.model';

interface LeaveRequestRow {
  id: string;
  employee_id: string;
  leave_type: string;
  start_date: Date;
  end_date: Date;
  reason: string | undefined;
  status: string;
  approved_by: string | null;
  approved_at: Date | null;
  rejection_reason: string | undefined;
  created_at: Date;
  updated_at: Date;
}

function mapRowToLeaveRequest(row: LeaveRequestRow): LeaveRequest {
  return {
    id: row.id,
    employeeId: row.employee_id,
    leaveType: row.leave_type as LeaveType,
    startDate: row.start_date,
    endDate: row.end_date,
    reason: row.reason,
    status: row.status as LeaveStatus,
    approvedBy: row.approved_by,
    approvedAt: row.approved_at,
    rejectionReason: row.rejection_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const COLUMN_MAP: Record<string, string> = {
  employeeId: 'employee_id',
  leaveType: 'leave_type',
  startDate: 'start_date',
  endDate: 'end_date',
  reason: 'reason',
  status: 'status',
  approvedBy: 'approved_by',
  approvedAt: 'approved_at',
  rejectionReason: 'rejection_reason',
};

export class PgLeaveRequestRepository implements ILeaveRequestRepository {
  async findById(id: string): Promise<LeaveRequest | null> {
    const result = await pool.query<LeaveRequestRow>(
      'SELECT * FROM leave_requests WHERE id = $1',
      [id],
    );
    if (result.rows.length === 0) {
      return null;
    }
    return mapRowToLeaveRequest(result.rows[0]);
  }

  async findByEmployeeId(employeeId: string): Promise<LeaveRequest[]> {
    const result = await pool.query<LeaveRequestRow>(
      'SELECT * FROM leave_requests WHERE employee_id = $1 ORDER BY created_at DESC',
      [employeeId],
    );
    return result.rows.map(mapRowToLeaveRequest);
  }

  async findByStatus(status: LeaveStatus): Promise<LeaveRequest[]> {
    const result = await pool.query<LeaveRequestRow>(
      'SELECT * FROM leave_requests WHERE status = $1 ORDER BY created_at DESC',
      [status],
    );
    return result.rows.map(mapRowToLeaveRequest);
  }

  async findByManagerId(managerId: string): Promise<LeaveRequest[]> {
    const result = await pool.query<LeaveRequestRow>(
      `SELECT lr.* FROM leave_requests lr
       JOIN employees e ON lr.employee_id = e.id
       WHERE e.manager_id = $1
       ORDER BY lr.created_at DESC`,
      [managerId],
    );
    return result.rows.map(mapRowToLeaveRequest);
  }

  async create(
    request: Omit<LeaveRequest, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<LeaveRequest> {
    const id = randomUUID();
    const result = await pool.query<LeaveRequestRow>(
      `INSERT INTO leave_requests (
        id, employee_id, leave_type, start_date, end_date,
        reason, status, approved_by, approved_at, rejection_reason
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        id,
        request.employeeId,
        request.leaveType,
        request.startDate,
        request.endDate,
        request.reason ?? null,
        request.status,
        request.approvedBy ?? null,
        request.approvedAt ?? null,
        request.rejectionReason ?? null,
      ],
    );
    return mapRowToLeaveRequest(result.rows[0]);
  }

  async update(
    id: string,
    data: Partial<LeaveRequest>,
  ): Promise<LeaveRequest | null> {
    const keys = Object.keys(data).filter(
      (k) =>
        data[k as keyof typeof data] !== undefined &&
        COLUMN_MAP[k] !== undefined,
    );

    if (keys.length === 0) {
      const existing = await this.findById(id);
      return existing;
    }

    const setClauses = keys.map(
      (key, index) => `${COLUMN_MAP[key]} = $${index + 2}`,
    );
    const values = keys.map((key) => data[key as keyof typeof data]);

    const result = await pool.query<LeaveRequestRow>(
      `UPDATE leave_requests SET ${setClauses.join(', ')}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, ...values],
    );

    if (result.rows.length === 0) {
      return null;
    }
    return mapRowToLeaveRequest(result.rows[0]);
  }

  async updateStatus(
    id: string,
    status: LeaveStatus,
    approvedBy?: string,
    rejectionReason?: string,
  ): Promise<LeaveRequest | null> {
    const setClauses: string[] = ['status = $2'];
    const values: unknown[] = [id, status];
    let paramIndex = 3;

    if (approvedBy !== undefined) {
      setClauses.push(`approved_by = $${paramIndex}`);
      values.push(approvedBy);
      paramIndex++;
    }

    if (status === 'approved') {
      setClauses.push(`approved_at = $${paramIndex}`);
      values.push(new Date());
      paramIndex++;
    }

    if (rejectionReason !== undefined) {
      setClauses.push(`rejection_reason = $${paramIndex}`);
      values.push(rejectionReason);
      paramIndex++;
    }

    setClauses.push('updated_at = NOW()');

    const result = await pool.query<LeaveRequestRow>(
      `UPDATE leave_requests SET ${setClauses.join(', ')} WHERE id = $1 RETURNING *`,
      values,
    );

    if (result.rows.length === 0) {
      return null;
    }
    return mapRowToLeaveRequest(result.rows[0]);
  }
}
