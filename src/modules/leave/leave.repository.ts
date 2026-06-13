import { Pool, QueryResultRow } from 'pg';
import { LeaveRequest, CreateLeaveRequestDto } from './leave.model';

export interface ILeaveRepository {
  create(dto: CreateLeaveRequestDto): Promise<LeaveRequest>;
  findById(id: string): Promise<LeaveRequest | null>;
  findByEmployeeId(employeeId: string): Promise<LeaveRequest[]>;
  updateStatus(id: string, status: LeaveRequest['status'], managerNotes?: string, approvedBy?: string): Promise<LeaveRequest>;
}

export class PostgresLeaveRequestRepository implements ILeaveRepository {
  constructor(private readonly pool: Pool) {}

  private mapRow(row: QueryResultRow): LeaveRequest {
    return {
      id: row.id,
      employeeId: row.employee_id,
      leavePolicyId: row.leave_policy_id,
      startDate: row.start_date,
      endDate: row.end_date,
      totalDays: parseFloat(row.total_days),
      status: row.status,
      reason: row.reason ?? undefined,
      managerNotes: row.manager_notes ?? undefined,
      approvedBy: row.approved_by ?? undefined,
      approvedAt: row.approved_at ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  async create(dto: CreateLeaveRequestDto): Promise<LeaveRequest> {
    const query = `
      INSERT INTO leave_requests (
        employee_id, leave_policy_id, start_date, end_date, total_days, reason
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const values = [
      dto.employeeId,
      dto.leavePolicyId,
      dto.startDate,
      dto.endDate,
      dto.totalDays,
      dto.reason ?? null
    ];
    
    const result = await this.pool.query(query, values);
    return this.mapRow(result.rows[0]);
  }

  async findById(id: string): Promise<LeaveRequest | null> {
    const query = `SELECT * FROM leave_requests WHERE id = $1`;
    const result = await this.pool.query(query, [id]);
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  async findByEmployeeId(employeeId: string): Promise<LeaveRequest[]> {
    const query = `SELECT * FROM leave_requests WHERE employee_id = $1 ORDER BY created_at DESC`;
    const result = await this.pool.query(query, [employeeId]);
    return result.rows.map(r => this.mapRow(r));
  }

  async updateStatus(id: string, status: LeaveRequest['status'], managerNotes?: string, approvedBy?: string): Promise<LeaveRequest> {
    const query = `
      UPDATE leave_requests 
      SET status = $1, manager_notes = $2, approved_by = $3, approved_at = $4, updated_at = NOW()
      WHERE id = $5
      RETURNING *
    `;
    const approvedAt = (status === 'APPROVED' || status === 'REJECTED') ? new Date() : null;
    const result = await this.pool.query(query, [status, managerNotes ?? null, approvedBy ?? null, approvedAt, id]);
    if (result.rows.length === 0) {
      throw new Error(`Leave request with id ${id} not found`);
    }
    return this.mapRow(result.rows[0]);
  }
}
