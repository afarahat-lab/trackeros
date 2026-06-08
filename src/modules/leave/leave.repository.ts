import { LeaveRequest, LeaveBalance } from './leave.model';
import { Pool } from 'pg';

const pool = new Pool();

export class LeaveRepository {
    async createLeaveRequest(leaveRequest: LeaveRequest): Promise<LeaveRequest> {
        const result = await pool.query(
            `INSERT INTO leave_requests (employeeId, leaveType, startDate, endDate, status, createdAt)
            VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *`,
            [leaveRequest.employeeId, leaveRequest.leaveType, leaveRequest.startDate, leaveRequest.endDate, leaveRequest.status]
        );
        return result.rows[0];
    }

    async getLeaveRequestsByEmployeeId(employeeId: string): Promise<LeaveRequest[]> {
        const result = await pool.query(
            `SELECT * FROM leave_requests WHERE employeeId = $1`,
            [employeeId]
        );
        return result.rows;
    }

    async createLeaveBalance(leaveBalance: LeaveBalance): Promise<LeaveBalance> {
        const result = await pool.query(
            `INSERT INTO leave_balances (employeeId, totalDays, usedDays, year)
            VALUES ($1, $2, $3, $4) RETURNING *`,
            [leaveBalance.employeeId, leaveBalance.totalDays, leaveBalance.usedDays, leaveBalance.year]
        );
        return result.rows[0];
    }

    async getLeaveBalanceByEmployeeId(employeeId: string, year: number): Promise<LeaveBalance> {
        const result = await pool.query(
            `SELECT * FROM leave_balances WHERE employeeId = $1 AND year = $2`,
            [employeeId, year]
        );
        return result.rows[0];
    }
}
