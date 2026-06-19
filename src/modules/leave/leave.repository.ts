import { LeaveStatus } from '../../shared/types/index';
import { LeaveRequest, CreateLeaveRequestDto } from './leave.model';
import pool from '../../shared/db/connection';

export interface ILeaveRepository {
  create(data: CreateLeaveRequestDto, changedBy: number): Promise<LeaveRequest>;
  findById(id: number): Promise<LeaveRequest | null>;
  update(id: number, updates: Partial<Omit<LeaveRequest, 'id' | 'createdAt'>>, changedBy: number): Promise<LeaveRequest>;
  delete(id: number, changedBy: number): Promise<void>;
  findByEmployeeId(employeeId: number): Promise<LeaveRequest[]>;
  findByManagerId(managerId: number): Promise<LeaveRequest[]>;
  findByStatus(status: LeaveStatus): Promise<LeaveRequest[]>;
}

export class PostgresLeaveRepository implements ILeaveRepository {
  async create(data: CreateLeaveRequestDto, changedBy: number): Promise<LeaveRequest> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query(
        `INSERT INTO leave_requests (employee_id, leave_type, start_date, end_date, reason, status, manager_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [data.employeeId, data.leaveType, data.startDate, data.endDate, data.reason, LeaveStatus.Pending, data.managerId || null]
      );
      const leaveRequest = this.mapRowToLeaveRequest(result.rows[0]);
      await client.query(
        `INSERT INTO audit_log (table_name, record_id, action, new_data, changed_by)
         VALUES ('leave_requests', $1, 'INSERT', $2, $3)`,
        [leaveRequest.id, JSON.stringify(leaveRequest), changedBy]
      );
      await client.query('COMMIT');
      return leaveRequest;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async findById(id: number): Promise<LeaveRequest | null> {
    const result = await pool.query('SELECT * FROM leave_requests WHERE id = $1', [id]);
    if (result.rows.length === 0) return null;
    return this.mapRowToLeaveRequest(result.rows[0]);
  }

  async update(id: number, updates: Partial<Omit<LeaveRequest, 'id' | 'createdAt'>>, changedBy: number): Promise<LeaveRequest> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const current = await client.query('SELECT * FROM leave_requests WHERE id = $1', [id]);
      if (current.rows.length === 0) throw new Error('Leave request not found');
      const oldData = current.rows[0];
      const setClauses: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;
      for (const [key, value] of Object.entries(updates)) {
        const column = camelToSnake(key);
        setClauses.push(`${column} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
      values.push(id);
      const result = await client.query(
        `UPDATE leave_requests SET ${setClauses.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex} RETURNING *`,
        values
      );
      const updated = this.mapRowToLeaveRequest(result.rows[0]);
      await client.query(
        `INSERT INTO audit_log (table_name, record_id, action, old_data, new_data, changed_by)
         VALUES ('leave_requests', $1, 'UPDATE', $2, $3, $4)`,
        [id, JSON.stringify(oldData), JSON.stringify(updated), changedBy]
      );
      await client.query('COMMIT');
      return updated;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async delete(id: number, changedBy: number): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const current = await client.query('SELECT * FROM leave_requests WHERE id = $1', [id]);
      if (current.rows.length === 0) throw new Error('Leave request not found');
      const oldData = current.rows[0];
      await client.query('DELETE FROM leave_requests WHERE id = $1', [id]);
      await client.query(
        `INSERT INTO audit_log (table_name, record_id, action, old_data, changed_by)
         VALUES ('leave_requests', $1, 'DELETE', $2, $3)`,
        [id, JSON.stringify(oldData), changedBy]
      );
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async findByEmployeeId(employeeId: number): Promise<LeaveRequest[]> {
    const result = await pool.query('SELECT * FROM leave_requests WHERE employee_id = $1', [employeeId]);
    return result.rows.map(this.mapRowToLeaveRequest);
  }

  async findByManagerId(managerId: number): Promise<LeaveRequest[]> {
    const result = await pool.query('SELECT * FROM leave_requests WHERE manager_id = $1', [managerId]);
    return result.rows.map(this.mapRowToLeaveRequest);
  }

  async findByStatus(status: LeaveStatus): Promise<LeaveRequest[]> {
    const result = await pool.query('SELECT * FROM leave_requests WHERE status = $1', [status]);
    return result.rows.map(this.mapRowToLeaveRequest);
  }

  private mapRowToLeaveRequest(row: any): LeaveRequest {
    return {
      id: row.id,
      employeeId: row.employee_id,
      leaveType: row.leave_type,
      startDate: row.start_date,
      endDate: row.end_date,
      reason: row.reason,
      status: row.status,
      submittedAt: row.submitted_at,
      reviewedBy: row.reviewed_by,
      reviewedAt: row.reviewed_at,
      comments: row.comments,
      managerId: row.manager_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}
