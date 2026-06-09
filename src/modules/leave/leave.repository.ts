import { Pool } from 'pg';
import { LeaveRequest } from './leave.model';

export class LeaveRequestRepository {
    private db: Pool;

    constructor(db: Pool) {
        this.db = db;
    }

    async create(leaveRequest: Omit<LeaveRequest, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeaveRequest> {
        const { employeeId, leaveType, startDate, endDate } = leaveRequest;
        const createdAt = new Date();
        const result = await this.db.query(
            'INSERT INTO leave_requests (employeeId, leaveType, startDate, endDate, status, createdAt, updatedAt) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [employeeId, leaveType, startDate, endDate, 'pending', createdAt, createdAt]
        );
        return result.rows[0];
    }

    async findById(id: string): Promise<LeaveRequest | null> {
        const result = await this.db.query('SELECT * FROM leave_requests WHERE id = $1', [id]);
        return result.rows[0] || null;
    }

    async update(id: string, leaveRequest: Partial<Omit<LeaveRequest, 'id' | 'createdAt'>>): Promise<LeaveRequest | null> {
        const updatedAt = new Date();
        const result = await this.db.query(
            'UPDATE leave_requests SET employeeId = COALESCE($1, employeeId), leaveType = COALESCE($2, leaveType), startDate = COALESCE($3, startDate), endDate = COALESCE($4, endDate), status = COALESCE($5, status), updatedAt = $6 WHERE id = $7 RETURNING *',
            [leaveRequest.employeeId, leaveRequest.leaveType, leaveRequest.startDate, leaveRequest.endDate, leaveRequest.status, updatedAt, id]
        );
        return result.rows[0] || null;
    }

    async delete(id: string): Promise<void> {
        await this.db.query('DELETE FROM leave_requests WHERE id = $1', [id]);
    }
}
