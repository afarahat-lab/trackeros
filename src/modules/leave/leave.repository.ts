import { LeaveRequest, LeaveBalance } from './leave.model';
import { Pool } from 'pg';

export class LeaveRepository {
    private db: Pool;

    constructor(db: Pool) {
        this.db = db;
    }

    async createLeaveRequest(leaveRequest: LeaveRequest): Promise<LeaveRequest> {
        const result = await this.db.query(
            'INSERT INTO leave_requests (employeeId, leaveType, startDate, endDate, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [leaveRequest.employeeId, leaveRequest.leaveType, leaveRequest.startDate, leaveRequest.endDate, leaveRequest.status]
        );
        return result.rows[0];
    }

    async getLeaveBalance(employeeId: string): Promise<LeaveBalance> {
        const result = await this.db.query(
            'SELECT * FROM leave_balances WHERE employeeId = $1',
            [employeeId]
        );
        return result.rows[0];
    }

    async updateLeaveBalance(employeeId: string, usedLeaves: number): Promise<LeaveBalance> {
        const result = await this.db.query(
            'UPDATE leave_balances SET usedLeaves = usedLeaves + $1 WHERE employeeId = $2 RETURNING *',
            [usedLeaves, employeeId]
        );
        return result.rows[0];
    }
}
