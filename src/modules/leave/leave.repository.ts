import { Pool, QueryResultRow } from 'pg';
import { LeaveRequest, CreateLeaveRequestDto, LeaveStatus } from './leave.model';

export interface ILeaveRepository {
  create(dto: CreateLeaveRequestDto): Promise<LeaveRequest>;
  findById(id: string): Promise<LeaveRequest | null>;
  findByEmployeeId(employeeId: string): Promise<LeaveRequest[]>;
  updateStatus(id: string, status: LeaveStatus, managerId: string): Promise<LeaveRequest>;
  update(id: string, updates: Partial<Omit<LeaveRequest, 'id' | 'createdAt' | 'updatedAt'>>): Promise<LeaveRequest>;
  delete(id: string): Promise<boolean>;
}

export class PgLeaveRepository implements ILeaveRepository {
  constructor(private readonly pool: Pool) {}

  private mapRow(row: QueryResultRow): LeaveRequest {
    return {
      id: row.id,
      employeeId: row.employee_id,
      leaveType: row.leave_type,
      startDate: row.start_date,
      endDate: row.end_date,
      status: row.status,
      reason: row.reason,
      managerId: row.manager_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  async create(dto: CreateLeaveRequestDto): Promise<LeaveRequest> {
    const query = `
      INSERT INTO leave_requests (
        employee_id, leave_type, start_date, end_date, reason, manager_id
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const values: unknown[] = [
      dto.employeeId,
      dto.leaveType,
      dto.startDate,
      dto.endDate,
      dto.reason ?? null,
      dto.managerId ?? null
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

  async updateStatus(id: string, status: LeaveStatus, managerId: string): Promise<LeaveRequest> {
    const query = `
      UPDATE leave_requests 
      SET status = $1, manager_id = $2, updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `;
    const result = await this.pool.query(query, [status, managerId, id]);
    if (result.rows.length === 0) {
      throw new Error(`Leave request with id ${id} not found`);
    }
    return this.mapRow(result.rows[0]);
  }

  async update(id: string, updates: Partial<Omit<LeaveRequest, 'id' | 'createdAt' | 'updatedAt'>>): Promise<LeaveRequest> {
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramCount = 1;

    if (updates.employeeId !== undefined) {
      setClauses.push(`employee_id = $${paramCount++}`);
      values.push(updates.employeeId);
    }
    if (updates.leaveType !== undefined) {
      setClauses.push(`leave_type = $${paramCount++}`);
      values.push(updates.leaveType);
    }
    if (updates.startDate !== undefined) {
      setClauses.push(`start_date = $${paramCount++}`);
      values.push(updates.startDate);
    }
    if (updates.endDate !== undefined) {
      setClauses.push(`end_date = $${paramCount++}`);
      values.push(updates.endDate);
    }
    if (updates.status !== undefined) {
      setClauses.push(`status = $${paramCount++}`);
      values.push(updates.status);
    }
    if (updates.reason !== undefined) {
      setClauses.push(`reason = $${paramCount++}`);
      values.push(updates.reason);
    }
    if (updates.managerId !== undefined) {
      setClauses.push(`manager_id = $${paramCount++}`);
      values.push(updates.managerId);
    }

    if (setClauses.length === 0) {
      throw new Error('No updates provided');
    }

    setClauses.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE leave_requests 
      SET ${setClauses.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await this.pool.query(query, values);
    if (result.rows.length === 0) {
      throw new Error(`Leave request with id ${id} not found`);
    }
    return this.mapRow(result.rows[0]);
  }

  async delete(id: string): Promise<boolean> {
    const query = `DELETE FROM leave_requests WHERE id = $1 RETURNING id`;
    const result = await this.pool.query(query, [id]);
    return (result.rowCount ?? 0) > 0;
  }
}
