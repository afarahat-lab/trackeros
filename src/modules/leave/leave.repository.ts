import { Pool } from 'pg';
import { LeaveRequest } from './leave.model';

export interface ILeaveRepository {
  createLeaveRequest(leaveRequest: LeaveRequest): Promise<LeaveRequest>;
  getLeaveRequestById(id: string): Promise<LeaveRequest | null>;
  updateLeaveRequest(id: string, leaveRequest: Partial<LeaveRequest>): Promise<LeaveRequest | null>;
  deleteLeaveRequest(id: string): Promise<void>;
}

export class LeaveRepository implements ILeaveRepository {
  private db: Pool;

  constructor(db: Pool) {
    this.db = db;
  }

  async createLeaveRequest(leaveRequest: LeaveRequest): Promise<LeaveRequest> {
    const result = await this.db.query(
      'INSERT INTO leave_requests (id, employeeId, leaveType, startDate, endDate, status, createdAt, updatedAt) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [leaveRequest.id, leaveRequest.employeeId, leaveRequest.leaveType, leaveRequest.startDate, leaveRequest.endDate, leaveRequest.status, leaveRequest.createdAt, leaveRequest.updatedAt]
    );
    return result.rows[0];
  }

  async getLeaveRequestById(id: string): Promise<LeaveRequest | null> {
    const result = await this.db.query('SELECT * FROM leave_requests WHERE id = $1', [id]);
    return result.rows.length ? result.rows[0] : null;
  }

  async updateLeaveRequest(id: string, leaveRequest: Partial<LeaveRequest>): Promise<LeaveRequest | null> {
    const result = await this.db.query(
      'UPDATE leave_requests SET employeeId = $1, leaveType = $2, startDate = $3, endDate = $4, status = $5, updatedAt = $6 WHERE id = $7 RETURNING *',
      [leaveRequest.employeeId, leaveRequest.leaveType, leaveRequest.startDate, leaveRequest.endDate, leaveRequest.status, new Date(), id]
    );
    return result.rows.length ? result.rows[0] : null;
  }

  async deleteLeaveRequest(id: string): Promise<void> {
    await this.db.query('DELETE FROM leave_requests WHERE id = $1', [id]);
  }
}
