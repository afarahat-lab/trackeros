import { Pool } from 'pg';
import { LeaveRequest } from './leave.model';

export class LeaveRequestRepository {
    private db: Pool;

    constructor(db: Pool) {
        this.db = db;
    }

    async create(leaveRequest: LeaveRequest): Promise<LeaveRequest> {
        const { employeeId, leaveType, startDate, endDate, status, createdAt, updatedAt } = leaveRequest;
        const result = await this.db.query(
            'INSERT INTO leave_requests (employeeId, leaveType, startDate, endDate, status, createdAt, updatedAt) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [employeeId, leaveType, startDate, endDate, status, createdAt, updatedAt]
        );
        return result.rows[0];
    }

    async findById(id: string): Promise<LeaveRequest | null> {
        const result = await this.db.query('SELECT * FROM leave_requests WHERE id = $1', [id]);
        return result.rows.length ? result.rows[0] : null;
    }

    async update(id: string, leaveRequest: Partial<LeaveRequest>): Promise<LeaveRequest | null> {
        const fields = Object.keys(leaveRequest).map((key, index) => `${key} = $${index + 1}`).join(', ');
        const values = Object.values(leaveRequest);
        const result = await this.db.query(
            `UPDATE leave_requests SET ${fields} WHERE id = $${values.length + 1} RETURNING *`,
            [...values, id]
        );
        return result.rows.length ? result.rows[0] : null;
    }

    async delete(id: string): Promise<void> {
        await this.db.query('DELETE FROM leave_requests WHERE id = $1', [id]);
    }
}
