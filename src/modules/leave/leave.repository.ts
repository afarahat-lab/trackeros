import { LeaveType, LeaveStatus } from '../../shared/types/index';
import { LeaveRequest, CreateLeaveRequestDto } from './leave.model';
import { pool } from '../../shared/db/connection';

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
        `INSERT INTO audit_log (table_name, record_id, action, changed_by, changed_at, new_values)
         VALUES ($1, $2, $3, $4, NOW(), $5)`,
        ['leave_requests', leaveRequest.id, 'CREATE', changedBy, JSON.stringify(leaveRequest)]
      );

      await client.query('COMMIT');
      return leaveRequest;
    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error(`Failed to create leave request: ${(error as Error).message}`);
    } finally {
      client.release();
    }
  }

  async findById(id: number): Promise<LeaveRequest | null> {
    try {
      const result = await pool.query('SELECT * FROM leave_requests WHERE id = $1', [id]);
      if (result.rows.length === 0) return null;
      return this.mapRowToLeaveRequest(result.rows[0]);
    } catch (error) {
      throw new Error(`Failed to find leave request by id: ${(error as Error).message}`);
    }
  }

  async update(id: number, updates: Partial<Omit<LeaveRequest, 'id' | 'createdAt'>>, changedBy: number): Promise<LeaveRequest> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const currentResult = await client.query('SELECT * FROM leave_requests WHERE id = $1', [id]);
      if (currentResult.rows.length === 0) {
        throw new Error('Leave request not found');
      }
      const oldValues = currentResult.rows[0];

      const setClauses: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      const fieldMapping: Record<string, string> = {
        employeeId: 'employee_id',
        leaveType: 'leave_type',
        startDate: 'start_date',
        endDate: 'end_date',
        reason: 'reason',
        status: 'status',
        submittedAt: 'submitted_at',
        reviewedBy: 'reviewed_by',
        reviewedAt: 'reviewed_at',
        comments: 'comments',
        managerId: 'manager_id',
        updatedAt: 'updated_at',
      };

      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined && key in fieldMapping) {
          setClauses.push(`${fieldMapping[key]} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
      }

      if (setClauses.length === 0) {
        await client.query('COMMIT');
        return this.mapRowToLeaveRequest(oldValues);
      }

      setClauses.push(`updated_at = NOW()`);
      values.push(id);
      const query = `UPDATE leave_requests SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
      const result = await client.query(query, values);
      const newRecord = result.rows[0];

      await client.query(
        `INSERT INTO audit_log (table_name, record_id, action, changed_by, changed_at, old_values, new_values)
         VALUES ($1, $2, $3, $4, NOW(), $5, $6)`,
        ['leave_requests', id, 'UPDATE', changedBy, JSON.stringify(oldValues), JSON.stringify(newRecord)]
      );

      await client.query('COMMIT');
      return this.mapRowToLeaveRequest(newRecord);
    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error(`Failed to update leave request: ${(error as Error).message}`);
    } finally {
      client.release();
    }
  }

  async delete(id: number, changedBy: number): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const currentResult = await client.query('SELECT * FROM leave_requests WHERE id = $1', [id]);
      if (currentResult.rows.length === 0) {
        throw new Error('Leave request not found');
      }
      const oldValues = currentResult.rows[0];

      await client.query('DELETE FROM leave_requests WHERE id = $1', [id]);

      await client.query(
        `INSERT INTO audit_log (table_name, record_id, action, changed_by, changed_at, old_values)
         VALUES ($1, $2, $3, $4, NOW(), $5)`,
        ['leave_requests', id, 'DELETE', changedBy, JSON.stringify(oldValues)]
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error(`Failed to delete leave request: ${(error as Error).message}`);
    } finally {
      client.release();
    }
  }

  async findByEmployeeId(employeeId: number): Promise<LeaveRequest[]> {
    try {
      const result = await pool.query('SELECT * FROM leave_requests WHERE employee_id = $1', [employeeId]);
      return result.rows.map(this.mapRowToLeaveRequest);
    } catch (error) {
      throw new Error(`Failed to find leave requests by employee id: ${(error as Error).message}`);
    }
  }

  async findByManagerId(managerId: number): Promise<LeaveRequest[]> {
    try {
      const result = await pool.query('SELECT * FROM leave_requests WHERE manager_id = $1', [managerId]);
      return result.rows.map(this.mapRowToLeaveRequest);
    } catch (error) {
      throw new Error(`Failed to find leave requests by manager id: ${(error as Error).message}`);
    }
  }

  async findByStatus(status: LeaveStatus): Promise<LeaveRequest[]> {
    try {
      const result = await pool.query('SELECT * FROM leave_requests WHERE status = $1', [status]);
      return result.rows.map(this.mapRowToLeaveRequest);
    } catch (error) {
      throw new Error(`Failed to find leave requests by status: ${(error as Error).message}`);
    }
  }

  private mapRowToLeaveRequest(row: any): LeaveRequest {
    return {
      id: row.id,
      employeeId: row.employee_id,
      leaveType: row.leave_type as LeaveType,
      startDate: row.start_date,
      endDate: row.end_date,
      reason: row.reason,
      status: row.status as LeaveStatus,
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
