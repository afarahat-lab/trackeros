import { PoolClient } from 'pg';
import { pool } from '../../shared/db/connection';
import { LeaveRequestStatus } from '../../shared/types';
import {
  ILeaveRequestRepository,
  LeaveRequest,
} from './leave.model';

interface LeaveRequestRow {
  id: string;
  employee_id: string;
  leave_type_id: string;
  start_date: Date;
  end_date: Date;
  reason: string | null;
  status: LeaveRequestStatus;
  approved_by: string | null;
  approved_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

function toLeaveRequest(row: LeaveRequestRow): LeaveRequest {
  return {
    id: row.id,
    employeeId: row.employee_id,
    leaveTypeId: row.leave_type_id,
    startDate: row.start_date,
    endDate: row.end_date,
    reason: row.reason,
    status: row.status,
    approvedBy: row.approved_by,
    approvedAt: row.approved_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const COLUMNS: Partial<Record<keyof LeaveRequest, string>> = {
  employeeId: 'employee_id',
  leaveTypeId: 'leave_type_id',
  startDate: 'start_date',
  endDate: 'end_date',
  reason: 'reason',
  status: 'status',
  approvedBy: 'approved_by',
  approvedAt: 'approved_at',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
};

export class PgLeaveRequestRepository implements ILeaveRequestRepository {
  async create(
    request: LeaveRequest,
    client?: PoolClient,
  ): Promise<LeaveRequest> {
    const db = client ?? pool;
    const result = await db.query<LeaveRequestRow>(
      `INSERT INTO leave_requests (
         id, employee_id, leave_type_id, start_date, end_date, reason,
         status, approved_by, approved_at, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        request.id,
        request.employeeId,
        request.leaveTypeId,
        request.startDate,
        request.endDate,
        request.reason,
        request.status,
        request.approvedBy,
        request.approvedAt,
        request.createdAt,
        request.updatedAt,
      ],
    );
    return toLeaveRequest(result.rows[0]);
  }

  async findById(
    id: string,
    client?: PoolClient,
  ): Promise<LeaveRequest | null> {
    const db = client ?? pool;
    const result = await db.query<LeaveRequestRow>(
      `SELECT * FROM leave_requests WHERE id = $1`,
      [id],
    );
    return result.rows[0] ? toLeaveRequest(result.rows[0]) : null;
  }

  async findByEmployee(
    employeeId: string,
    client?: PoolClient,
  ): Promise<LeaveRequest[]> {
    const db = client ?? pool;
    const result = await db.query<LeaveRequestRow>(
      `SELECT * FROM leave_requests
       WHERE employee_id = $1
       ORDER BY created_at ASC`,
      [employeeId],
    );
    return result.rows.map(toLeaveRequest);
  }

  async update(
    id: string,
    changes: Partial<LeaveRequest>,
    client?: PoolClient,
  ): Promise<LeaveRequest | null> {
    const entries = (Object.entries(changes) as [keyof LeaveRequest, unknown][]).filter(
      ([key]) => key !== 'id' && COLUMNS[key] !== undefined,
    );

    if (entries.length === 0) {
      return this.findById(id, client);
    }

    const db = client ?? pool;
    const setClause = entries
      .map(([key], index) => `${COLUMNS[key]} = $${index + 1}`)
      .join(', ');
    const values = entries.map(([, value]) => value);

    const result = await db.query<LeaveRequestRow>(
      `UPDATE leave_requests
       SET ${setClause}, updated_at = NOW()
       WHERE id = $${entries.length + 1}
       RETURNING *`,
      [...values, id],
    );
    return result.rows[0] ? toLeaveRequest(result.rows[0]) : null;
  }

  async list(client?: PoolClient): Promise<LeaveRequest[]> {
    const db = client ?? pool;
    const result = await db.query<LeaveRequestRow>(
      `SELECT * FROM leave_requests ORDER BY created_at ASC`,
    );
    return result.rows.map(toLeaveRequest);
  }
}
