import { pool } from '../../shared/db/connection';
import { LeaveRequest, ILeaveRepository } from './leave.model';
import { LeaveStatus, LeaveRequestQueryParams } from '../../shared/types';

export class LeaveRepository implements ILeaveRepository {
  async findById(id: string): Promise<LeaveRequest | null> {
    const result = await pool.query('SELECT * FROM leave_requests WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return null;
    }
    return this.mapRow(result.rows[0]);
  }

  async findByEmployeeId(
    employeeId: string,
    params?: LeaveRequestQueryParams,
  ): Promise<LeaveRequest[]> {
    const conditions: string[] = ['employee_id = $1'];
    const values: unknown[] = [employeeId];
    let paramIndex = 2;

    if (params?.status !== undefined) {
      conditions.push(`status = $${paramIndex}`);
      values.push(params.status);
      paramIndex++;
    }

    if (params?.policyId !== undefined) {
      conditions.push(`policy_id = $${paramIndex}`);
      values.push(params.policyId);
      paramIndex++;
    }

    if (params?.startDateFrom !== undefined) {
      conditions.push(`start_date >= $${paramIndex}`);
      values.push(params.startDateFrom);
      paramIndex++;
    }

    if (params?.startDateTo !== undefined) {
      conditions.push(`start_date <= $${paramIndex}`);
      values.push(params.startDateTo);
      paramIndex++;
    }

    if (params?.endDateFrom !== undefined) {
      conditions.push(`end_date >= $${paramIndex}`);
      values.push(params.endDateFrom);
      paramIndex++;
    }

    if (params?.endDateTo !== undefined) {
      conditions.push(`end_date <= $${paramIndex}`);
      values.push(params.endDateTo);
      paramIndex++;
    }

    let sql = `SELECT * FROM leave_requests WHERE ${conditions.join(' AND ')} ORDER BY start_date DESC`;

    if (params?.limit !== undefined) {
      sql += ` LIMIT $${paramIndex}`;
      values.push(params.limit);
      paramIndex++;
    }

    if (params?.offset !== undefined) {
      sql += ` OFFSET $${paramIndex}`;
      values.push(params.offset);
      paramIndex++;
    }

    const result = await pool.query(sql, values);
    return result.rows.map((row: Record<string, unknown>) => this.mapRow(row));
  }

  async findByStatus(status: LeaveStatus): Promise<LeaveRequest[]> {
    const result = await pool.query(
      'SELECT * FROM leave_requests WHERE status = $1 ORDER BY start_date DESC',
      [status],
    );
    return result.rows.map((row: Record<string, unknown>) => this.mapRow(row));
  }

  async create(
    data: Omit<LeaveRequest, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<LeaveRequest> {
    const result = await pool.query(
      `INSERT INTO leave_requests (employee_id, policy_id, start_date, end_date, reason, status, approved_by, approved_at, rejection_reason)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        data.employeeId,
        data.policyId,
        data.startDate,
        data.endDate,
        data.reason ?? null,
        data.status,
        data.approvedBy ?? null,
        data.approvedAt ?? null,
        data.rejectionReason ?? null,
      ],
    );
    return this.mapRow(result.rows[0]);
  }

  async update(
    id: string,
    data: Partial<LeaveRequest>,
  ): Promise<LeaveRequest | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    const fieldMap: Array<{ key: keyof LeaveRequest; column: string }> = [
      { key: 'employeeId', column: 'employee_id' },
      { key: 'policyId', column: 'policy_id' },
      { key: 'startDate', column: 'start_date' },
      { key: 'endDate', column: 'end_date' },
      { key: 'reason', column: 'reason' },
      { key: 'status', column: 'status' },
      { key: 'approvedBy', column: 'approved_by' },
      { key: 'approvedAt', column: 'approved_at' },
      { key: 'rejectionReason', column: 'rejection_reason' },
    ];

    for (const { key, column } of fieldMap) {
      if (data[key] !== undefined) {
        fields.push(`${column} = $${paramIndex}`);
        values.push(data[key] ?? null);
        paramIndex++;
      }
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await pool.query(
      `UPDATE leave_requests SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values,
    );

    if (result.rows.length === 0) {
      return null;
    }
    return this.mapRow(result.rows[0]);
  }

  async updateStatus(
    id: string,
    status: LeaveStatus,
    approvedBy?: string | null,
    rejectionReason?: string | null,
  ): Promise<LeaveRequest | null> {
    const fields: string[] = ['status = $1'];
    const values: unknown[] = [status];
    let paramIndex = 2;

    if (status === 'APPROVED') {
      fields.push(`approved_at = NOW()`);
      fields.push(`approved_by = $${paramIndex}`);
      values.push(approvedBy ?? null);
      paramIndex++;
      fields.push(`rejection_reason = NULL`);
    } else {
      fields.push(`approved_at = NULL`);
      fields.push(`approved_by = NULL`);

      if (status === 'REJECTED') {
        fields.push(`rejection_reason = $${paramIndex}`);
        values.push(rejectionReason ?? null);
        paramIndex++;
      } else {
        fields.push(`rejection_reason = NULL`);
      }
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await pool.query(
      `UPDATE leave_requests SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values,
    );

    if (result.rows.length === 0) {
      return null;
    }
    return this.mapRow(result.rows[0]);
  }

  private mapRow(row: Record<string, unknown>): LeaveRequest {
    return {
      id: row.id as string,
      employeeId: row.employee_id as string,
      policyId: row.policy_id as string,
      startDate: new Date(row.start_date as string),
      endDate: new Date(row.end_date as string),
      reason: row.reason == null ? undefined : (row.reason as string),
      status: row.status as LeaveStatus,
      approvedBy: row.approved_by as string | null,
      approvedAt: row.approved_at ? new Date(row.approved_at as string) : null,
      rejectionReason: row.rejection_reason as string | null,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }
}
