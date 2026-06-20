import { pool } from '../../shared/db/connection';
import { ILeaveRequestRepository, CreateLeaveRequestDTO } from './leave.repository.interface';
import { LeaveRequest, LeaveStatus as LeaveRequestStatus } from '../../shared/types/index';
import { randomUUID } from 'crypto';

export class LeaveRequestRepository implements ILeaveRequestRepository {
  constructor(private readonly db: typeof pool) {}

  async create(data: CreateLeaveRequestDTO): Promise<LeaveRequest> {
    const id = randomUUID();
    const result = await this.db.query(
      `INSERT INTO leave_requests (id, employee_id, leave_type_id, start_date, end_date, reason, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [id, data.employeeId, data.leaveTypeId, data.startDate, data.endDate, data.reason, LeaveRequestStatus.Pending]
    );
    return this.mapToLeaveRequest(result.rows[0]);
  }

  async findById(id: string): Promise<LeaveRequest | null> {
    const result = await this.db.query('SELECT * FROM leave_requests WHERE id = $1', [id]);
    return result.rows[0] ? this.mapToLeaveRequest(result.rows[0]) : null;
  }

  async findByEmployeeId(employeeId: string): Promise<LeaveRequest[]> {
    const result = await this.db.query('SELECT * FROM leave_requests WHERE employee_id = $1', [employeeId]);
    return result.rows.map(this.mapToLeaveRequest);
  }

  async findByManagerId(managerId: string): Promise<LeaveRequest[]> {
    const result = await this.db.query(
      `SELECT lr.* FROM leave_requests lr
       JOIN employees e ON lr.employee_id = e.id
       WHERE e.manager_id = $1`,
      [managerId]
    );
    return result.rows.map(this.mapToLeaveRequest);
  }

  async updateStatus(id: string, status: LeaveRequestStatus, approvedBy?: string | null, approvedAt?: Date | null): Promise<LeaveRequest> {
    const result = await this.db.query(
      `UPDATE leave_requests 
       SET status = $2, approved_by = $3, approved_at = $4 
       WHERE id = $1 RETURNING *`,
      [id, status, approvedBy, approvedAt]
    );
    return this.mapToLeaveRequest(result.rows[0]);
  }

  private mapToLeaveRequest(row: any): LeaveRequest {
    return {
      id: row.id,
      employeeId: row.employee_id,
      leaveTypeId: row.leave_type_id,
      startDate: row.start_date,
      endDate: row.end_date,
      reason: row.reason,
      status: row.status
    };
  }
}
