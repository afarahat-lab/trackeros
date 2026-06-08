import { Pool } from 'pg';
import { LeaveRequest, LeaveBalance } from './leave.model';

const pool = new Pool();

export class LeaveRepository {
    async createLeaveRequest(leaveRequest: LeaveRequest): Promise<LeaveRequest> {
        const { employeeId, leaveType, startDate, endDate, status } = leaveRequest;
        const result = await pool.query(
            'INSERT INTO leave_requests (employeeId, leaveType, startDate, endDate, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [employeeId, leaveType, startDate, endDate, status]
        );
        return result.rows[0];
    }

    async getLeaveRequestsByEmployeeId(employeeId: string): Promise<LeaveRequest[]> {
        const result = await pool.query(
            'SELECT * FROM leave_requests WHERE employeeId = $1',
            [employeeId]
        );
        return result.rows;
    }

    async createLeaveBalance(leaveBalance: LeaveBalance): Promise<LeaveBalance> {
        const { employeeId, totalDays, usedDays, year } = leaveBalance;
        const result = await pool.query(
            'INSERT INTO leave_balances (employeeId, totalDays, usedDays, year) VALUES ($1, $2, $3, $4) RETURNING *',
            [employeeId, totalDays, usedDays, year]
        );
        return result.rows[0];
    }

    async getLeaveBalanceByEmployeeId(employeeId: string, year: number): Promise<LeaveBalance | null> {
        const result = await pool.query(
            'SELECT * FROM leave_balances WHERE employeeId = $1 AND year = $2',
            [employeeId, year]
        );
        return result.rows[0] || null;
    }
}
