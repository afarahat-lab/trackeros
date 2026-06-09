import { LeaveRequest } from './leave.model';
import { Pool } from 'pg';

export class LeaveRepository {
    private db: Pool;

    constructor(db: Pool) {
        this.db = db;
    }

    async createLeaveRequest(leaveRequest: LeaveRequest): Promise<LeaveRequest> {
        const query = `
            INSERT INTO leave_requests (id, employeeId, startDate, endDate, reason, status)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *;
        `;
        const values = [
            leaveRequest.id,
            leaveRequest.employeeId,
            leaveRequest.startDate,
            leaveRequest.endDate,
            leaveRequest.reason,
            leaveRequest.status,
        ];

        const result = await this.db.query(query, values);
        return result.rows[0];
    }

    // Additional repository methods can be added here
}
