import { LeaveRequest } from './leave.model';
import { Pool } from 'pg';

export class LeaveRepository {
    private db: Pool;

    constructor(db: Pool) {
        this.db = db;
    }

    async createLeaveRequest(leaveRequest: LeaveRequest): Promise<LeaveRequest> {
        const query = `
            INSERT INTO leave_requests (id, employeeId, leaveType, startDate, endDate, status, createdAt, updatedAt)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *;
        `;
        const values = [
            leaveRequest.id,
            leaveRequest.employeeId,
            leaveRequest.leaveType,
            leaveRequest.startDate,
            leaveRequest.endDate,
            leaveRequest.status,
            leaveRequest.createdAt,
            leaveRequest.updatedAt,
        ];

        const result = await this.db.query(query, values);
        return result.rows[0];
    }
}
