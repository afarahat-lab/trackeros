import { LeaveRequest, LeaveBalance } from './leave.model';
import { Pool } from 'pg';

export interface ILeaveRepository {
    createLeaveRequest(leaveRequest: LeaveRequest): Promise<LeaveRequest>;
    getLeaveRequestById(id: string): Promise<LeaveRequest | null>;
    updateLeaveRequestStatus(id: string, status: string): Promise<LeaveRequest | null>;
    getLeaveBalance(employeeId: string): Promise<LeaveBalance | null>;
    updateLeaveBalance(employeeId: string, usedLeaves: number): Promise<LeaveBalance | null>;
}

export class LeaveRepository implements ILeaveRepository {
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

    async getLeaveRequestById(id: string): Promise<LeaveRequest | null> {
        const result = await this.db.query('SELECT * FROM leave_requests WHERE id = $1', [id]);
        return result.rows.length ? result.rows[0] : null;
    }

    async updateLeaveRequestStatus(id: string, status: string): Promise<LeaveRequest | null> {
        const result = await this.db.query(
            'UPDATE leave_requests SET status = $1 WHERE id = $2 RETURNING *',
            [status, id]
        );
        return result.rows.length ? result.rows[0] : null;
    }

    async getLeaveBalance(employeeId: string): Promise<LeaveBalance | null> {
        const result = await this.db.query('SELECT * FROM leave_balances WHERE employeeId = $1', [employeeId]);
        return result.rows.length ? result.rows[0] : null;
    }

    async updateLeaveBalance(employeeId: string, usedLeaves: number): Promise<LeaveBalance | null> {
        const result = await this.db.query(
            'UPDATE leave_balances SET usedLeaves = usedLeaves + $1 WHERE employeeId = $2 RETURNING *',
            [usedLeaves, employeeId]
        );
        return result.rows.length ? result.rows[0] : null;
    }
}
