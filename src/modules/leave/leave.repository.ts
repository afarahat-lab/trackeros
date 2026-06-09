import { Pool } from 'pg';
import { LeaveRequest } from './leave.model';

export class LeaveRepository {
    private pool: Pool;

    constructor(pool: Pool) {
        this.pool = pool;
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

        const result = await this.pool.query(query, values);
        return result.rows[0];
    }

    // Additional repository methods can be added here
}
