import { Pool } from 'pg';
import { LeaveRequest, CreateLeaveRequestDto } from './leave.model';

export interface ILeaveRepository {
  create(dto: CreateLeaveRequestDto): Promise<LeaveRequest>;
  findById(id: string): Promise<LeaveRequest | null>;
  findByEmployeeId(employeeId: string): Promise<LeaveRequest[]>;
  updateStatus(id: string, status: LeaveRequest['status'], decidedAt?: Date, decisionNotes?: string): Promise<LeaveRequest>;
}

export class LeaveRepository implements ILeaveRepository {
  constructor(private readonly pool: Pool) {}

  async create(dto: CreateLeaveRequestDto): Promise<LeaveRequest> {
    const query = `
      INSERT INTO leave_requests (
        employeeId, leaveType, startDate, endDate, durationDays,
        reason, managerId, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const durationDays = Math.ceil((dto.endDate.getTime() - dto.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const values = [
      dto.employeeId,
      dto.leaveType,
      dto.startDate,
      dto.endDate,
      durationDays,
      dto.reason,
      dto.managerId,
      'DRAFT'
    ];
    const result = await this.pool.query<LeaveRequest>(query, values);
    return result.rows[0];
  }

  async findById(id: string): Promise<LeaveRequest | null> {
    const query = 'SELECT * FROM leave_requests WHERE id = $1';
    const result = await this.pool.query<LeaveRequest>(query, [id]);
    return result.rows[0] || null;
  }

  async findByEmployeeId(employeeId: string): Promise<LeaveRequest[]> {
    const query = 'SELECT * FROM leave_requests WHERE employeeId = $1 ORDER BY createdAt DESC';
    const result = await this.pool.query<LeaveRequest>(query, [employeeId]);
    return result.rows;
  }

  async updateStatus(id: string, status: LeaveRequest['status'], decidedAt?: Date, decisionNotes?: string): Promise<LeaveRequest> {
    const query = `
      UPDATE leave_requests
      SET status = $1, decidedAt = $2, decisionNotes = $3, updatedAt = NOW()
      WHERE id = $4
      RETURNING *
    `;
    const values = [status, decidedAt || null, decisionNotes || null, id];
    const result = await this.pool.query<LeaveRequest>(query, values);
    return result.rows[0];
  }
}
