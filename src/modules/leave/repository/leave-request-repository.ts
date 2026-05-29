import { LeaveRequest } from '../domain/leave-request';
import { db } from '../../shared/db';

export class LeaveRequestRepository {
  /**
   * Create a new leave request in the database.
   * @param leaveRequest - The leave request to create.
   * @returns The created leave request.
   */
  public async create(leaveRequest: Omit<LeaveRequest, 'id'>): Promise<LeaveRequest> {
    const result = await db.query(
      'INSERT INTO leave_requests (employee_id, start_date, end_date, reason, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [leaveRequest.employeeId, leaveRequest.startDate, leaveRequest.endDate, leaveRequest.reason, leaveRequest.status]
    );
    return result.rows[0];
  }

  /**
   * List leave requests, optionally filtered by status.
   * @param status - The status to filter by.
   * @returns A list of leave requests.
   */
  public async list(status?: 'pending' | 'approved' | 'rejected'): Promise<LeaveRequest[]> {
    const query = status ? 'SELECT * FROM leave_requests WHERE status = $1' : 'SELECT * FROM leave_requests';
    const params = status ? [status] : [];
    const result = await db.query(query, params);
    return result.rows;
  }
}
