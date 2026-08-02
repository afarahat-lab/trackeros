import { pool } from '../../shared/db/connection';
import { LeaveRequest } from './leave-request.model';
import { LeaveStatus } from '../../shared/types/index';

const COLUMN_MAP: Record<string, string> = {
  employeeId: 'employee_id',
  leaveTypeId: 'leave_type_id',
  startDate: 'start_date',
  endDate: 'end_date',
  rejectionReason: 'rejection_reason',
  approvedBy: 'approved_by',
  approvedAt: 'approved_at',
  cancelledAt: 'cancelled_at',
};

const READ_ONLY_FIELDS = new Set(['id', 'createdAt', 'updatedAt']);

function rowToLeaveRequest(row: Record<string, unknown>): LeaveRequest {
  return {
    id: row.id as string,
    employeeId: row.employee_id as string,
    leaveTypeId: row.leave_type_id as string,
    startDate: new Date(row.start_date as string),
    endDate: new Date(row.end_date as string),
    reason: (row.reason as string | undefined) ?? undefined,
    rejectionReason: (row.rejection_reason as string | undefined) ?? undefined,
    status: row.status as LeaveStatus,
    approvedBy: (row.approved_by as string | null) ?? null,
    approvedAt: row.approved_at ? new Date(row.approved_at as string) : null,
    cancelledAt: row.cancelled_at ? new Date(row.cancelled_at as string) : null,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };
}

export interface ILeaveRequestRepository {
  findById(id: string): Promise<LeaveRequest | null>;
  findByEmployee(employeeId: string): Promise<LeaveRequest[]>;
  findByStatus(status: LeaveStatus): Promise<LeaveRequest[]>;
  findByApprover(approvedBy: string): Promise<LeaveRequest[]>;
  findPendingByManager(managerId: string): Promise<LeaveRequest[]>;
  create(request: Omit<LeaveRequest, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeaveRequest>;
  update(id: string, data: Partial<LeaveRequest>): Promise<LeaveRequest | null>;
  updateStatus(
    id: string,
    status: LeaveStatus,
    extra?: { rejectionReason?: string; approvedBy?: string; approvedAt?: Date; cancelledAt?: Date },
  ): Promise<LeaveRequest | null>;
}

export class LeaveRequestRepository implements ILeaveRequestRepository {
  async findById(id: string): Promise<LeaveRequest | null> {
    const result = await pool.query(
      'SELECT * FROM leave_requests WHERE id = $1',
      [id],
    );
    if (result.rows.length === 0) {
      return null;
    }
    return rowToLeaveRequest(result.rows[0]);
  }

  async findByEmployee(employeeId: string): Promise<LeaveRequest[]> {
    const result = await pool.query(
      'SELECT * FROM leave_requests WHERE employee_id = $1 ORDER BY created_at DESC',
      [employeeId],
    );
    return result.rows.map(rowToLeaveRequest);
  }

  async findByStatus(status: LeaveStatus): Promise<LeaveRequest[]> {
    const result = await pool.query(
      'SELECT * FROM leave_requests WHERE status = $1 ORDER BY created_at DESC',
      [status],
    );
    return result.rows.map(rowToLeaveRequest);
  }

  async findByApprover(approvedBy: string): Promise<LeaveRequest[]> {
    const result = await pool.query(
      'SELECT * FROM leave_requests WHERE approved_by = $1 ORDER BY created_at DESC',
      [approvedBy],
    );
    return result.rows.map(rowToLeaveRequest);
  }

  async findPendingByManager(managerId: string): Promise<LeaveRequest[]> {
    const result = await pool.query(
      `SELECT lr.* FROM leave_requests lr
       INNER JOIN employees e ON lr.employee_id = e.id
       WHERE e.manager_id = $1 AND lr.status = $2
       ORDER BY lr.created_at DESC`,
      [managerId, LeaveStatus.SUBMITTED],
    );
    return result.rows.map(rowToLeaveRequest);
  }

  async create(
    request: Omit<LeaveRequest, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<LeaveRequest> {
    const result = await pool.query(
      `INSERT INTO leave_requests (
        employee_id, leave_type_id, start_date, end_date,
        reason, rejection_reason, status, approved_by,
        approved_at, cancelled_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        request.employeeId,
        request.leaveTypeId,
        request.startDate,
        request.endDate,
        request.reason ?? null,
        request.rejectionReason ?? null,
        request.status,
        request.approvedBy ?? null,
        request.approvedAt ?? null,
        request.cancelledAt ?? null,
      ],
    );
    return rowToLeaveRequest(result.rows[0]);
  }

  async update(
    id: string,
    data: Partial<LeaveRequest>,
  ): Promise<LeaveRequest | null> {
    const keys = Object.keys(data).filter((k) => !READ_ONLY_FIELDS.has(k));
    if (keys.length === 0) {
      const existing = await this.findById(id);
      return existing;
    }

    const setClauses = keys.map((key, index) => {
      const column = COLUMN_MAP[key] ?? key;
      return `${column} = $${index + 2}`;
    });
    const values = keys.map((key) => (data as Record<string, unknown>)[key]);

    const result = await pool.query(
      `UPDATE leave_requests SET ${setClauses.join(', ')}, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, ...values],
    );
    if (result.rows.length === 0) {
      return null;
    }
    return rowToLeaveRequest(result.rows[0]);
  }

  async updateStatus(
    id: string,
    status: LeaveStatus,
    extra?: { rejectionReason?: string; approvedBy?: string; approvedAt?: Date; cancelledAt?: Date },
  ): Promise<LeaveRequest | null> {
    const setClauses: string[] = ['status = $2'];
    const values: unknown[] = [id, status];

    if (extra) {
      if (extra.rejectionReason !== undefined) {
        setClauses.push(`rejection_reason = $${values.length + 1}`);
        values.push(extra.rejectionReason);
      }
      if (extra.approvedBy !== undefined) {
        setClauses.push(`approved_by = $${values.length + 1}`);
        values.push(extra.approvedBy);
      }
      if (extra.approvedAt !== undefined) {
        setClauses.push(`approved_at = $${values.length + 1}`);
        values.push(extra.approvedAt);
      }
      if (extra.cancelledAt !== undefined) {
        setClauses.push(`cancelled_at = $${values.length + 1}`);
        values.push(extra.cancelledAt);
      }
    }

    const result = await pool.query(
      `UPDATE leave_requests SET ${setClauses.join(', ')}, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      values,
    );
    if (result.rows.length === 0) {
      return null;
    }
    return rowToLeaveRequest(result.rows[0]);
  }
}
