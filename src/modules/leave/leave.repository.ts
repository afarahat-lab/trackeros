import { LeaveRequest, CreateLeaveRequestDto } from './leave.model';
import { Pool } from 'pg';

export class LeaveRepository {
    private db: Pool;

    constructor(db: Pool) {
        this.db = db;
    }

    async createLeaveRequest(dto: CreateLeaveRequestDto): Promise<LeaveRequest> {
        const { employeeId, leaveType, startDate, endDate } = dto;
        const createdAt = new Date();
        const updatedAt = new Date();

        const result = await this.db.query(
            `INSERT INTO leave_requests (employeeId, leaveType, startDate, endDate, status, createdAt, updatedAt)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [employeeId, leaveType, startDate, endDate, 'pending', createdAt, updatedAt]
        );

        return result.rows[0];
    }
}
