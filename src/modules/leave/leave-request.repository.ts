import { pool } from '../../shared/db/connection';
import { LeaveRequest, CreateLeaveRequestDto } from './leave-request.model';
import { LeaveStatus } from '../../shared/types';

export interface ILeaveRequestRepository {
  findByEmployeeId(employeeId: string): Promise<LeaveRequest[]>;
  findById(id: string): Promise<LeaveRequest | null>;
  findByManagerId(managerId: string): Promise<LeaveRequest[]>;
  findByStatus(status: LeaveStatus): Promise<LeaveRequest[]>;
  create(dto: CreateLeaveRequestDto): Promise<LeaveRequest>;
  updateStatus(id: string, status: LeaveStatus, approvedBy?: string, rejectionReason?: string): Promise<LeaveRequest | null>;
  findAll(): Promise<LeaveRequest[]>;
}

export class LeaveRequestRepository implements ILeaveRequestRepository {
  async findByEmployeeId(employeeId: string): Promise<LeaveRequest[]> {
    const result = await pool.query<LeaveRequest>(
      'SELECT * FROM leave_requests WHERE employee_id = $1 ORDER BY created_at DESC',
      [employeeId]
    );
    return result.rows;
  }

  async findById(id: string): Promise<LeaveRequest | null> {
    const result = await pool.query<LeaveRequest>(
      'SELECT * FROM leave_requests WHERE id = $1',
      [id]
    );
    return result.rows[0] ?? null;
  }

  async findByManagerId(managerId: string): Promise<LeaveRequest[]> {
    const result = await pool.query<LeaveRequest>(
      'SELECT * FROM leave_requests WHERE manager_id = $1 ORDER BY created_at DESC',
      [managerId]
    );
    return result.rows;
  }

  async findByStatus(status: LeaveStatus): Promise<LeaveRequest[]> {
    const result = await pool.query<LeaveRequest>(
      'SELECT * FROM leave_requests WHERE status = $1 ORDER BY created_at DESC',
      [status]
    );
    return result.rows;
  }

  async create(dto: CreateLeaveRequestDto): Promise<LeaveRequest> {
    const result = await pool.query<LeaveRequest>(
      `INSERT INTO leave_requests (employee_id, leave_type_id, start_date, end_date, total_days, reason, status, manager_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [dto.employeeId, dto.leaveTypeId, dto.startDate, dto.endDate, dto.totalDays, dto.reason, LeaveStatus.PENDING, dto.managerId]
    );
    return result.rows[0];
  }

  async updateStatus(id: string, status: LeaveStatus, approvedBy?: string, rejectionReason?: string): Promise<LeaveRequest | null> {
    const fields: string[] = ['status = $2', 'updated_at = NOW()'];
    const values: unknown[] = [id, status];
    let paramIndex = 3;

    if (status === LeaveStatus.APPROVED && approvedBy) {
      fields.push(`approved_by = $${paramIndex++}`);
      values.push(approvedBy);
      fields.push(`approved_at = NOW()`);
    }

    if (status === LeaveStatus.REJECTED && rejectionReason) {
      fields.push(`rejection_reason = $${paramIndex++}`);
      values.push(rejectionReason);
    }

    if (status === LeaveStatus.CANCELLED) {
      fields.push(`cancelled_at = NOW()`);
    }

    const result = await pool.query<LeaveRequest>(
      `UPDATE leave_requests SET ${fields.join(', ')} WHERE id = $1 RETURNING *`,
      values
    );
    return result.rows[0] ?? null;
  }

  async findAll(): Promise<LeaveRequest[]> {
    const result = await pool.query<LeaveRequest>(
      'SELECT * FROM leave_requests ORDER BY created_at DESC'
    );
    return result.rows;
  }
}
