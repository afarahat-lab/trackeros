import { Pool } from 'pg';
import { LeaveRequest, CreateLeaveRequestDto } from './leave.model';

const pool = new Pool();

export class LeaveRepository {
    async createLeaveRequest(dto: CreateLeaveRequestDto): Promise<LeaveRequest> {
        const { employeeId, startDate, endDate, reason } = dto;
        const result = await pool.query(
            'INSERT INTO leave_requests (employeeId, startDate, endDate, status, reason) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [employeeId, startDate, endDate, 'pending', reason]
        );
        return result.rows[0];
    }

    async getLeaveRequestById(id: string): Promise<LeaveRequest | null> {
        const result = await pool.query('SELECT * FROM leave_requests WHERE id = $1', [id]);
        return result.rows.length ? result.rows[0] : null;
    }

    async updateLeaveRequest(id: string, updates: Partial<LeaveRequest>): Promise<LeaveRequest | null> {
        const fields = Object.keys(updates).map((key, index) => `${key} = $${index + 1}`).join(', ');
        const values = Object.values(updates);
        const result = await pool.query(`UPDATE leave_requests SET ${fields} WHERE id = $${values.length + 1} RETURNING *`, [...values, id]);
        return result.rows.length ? result.rows[0] : null;
    }

    async deleteLeaveRequest(id: string): Promise<void> {
        await pool.query('DELETE FROM leave_requests WHERE id = $1', [id]);
    }

    async getAllLeaveRequests(): Promise<LeaveRequest[]> {
        const result = await pool.query('SELECT * FROM leave_requests');
        return result.rows;
    }
}
