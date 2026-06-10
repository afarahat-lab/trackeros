import type { Pool } from 'pg';
import pool from '../../shared/db/connection';
import type { LeaveRequest, LeaveRequestRecord } from './leave.model';
import type { LeaveRepository } from './leave.repository';

/** PostgreSQL-backed leave repository implementation. */
export class PostgresLeaveRepository implements LeaveRepository {
  public constructor(private readonly db: Pool = pool) {}

  /** Create a leave request. */
  public async create(leaveRequest: LeaveRequest): Promise<LeaveRequest> {
    const sql = `
      INSERT INTO leave_requests (
        id,
        employee_id,
        leave_type,
        start_date,
        end_date,
        status,
        approver_employee_id,
        created_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING *
    `;

    const result = await this.db.query<LeaveRequestRecord>(sql, [
      leaveRequest.id,
      leaveRequest.employeeId,
      leaveRequest.leaveType,
      leaveRequest.startDate,
      leaveRequest.endDate,
      leaveRequest.status,
      leaveRequest.approverEmployeeId,
      leaveRequest.createdAt,
    ]);

    return this.toEntity(result.rows[0] ?? this.toRecord(leaveRequest));
  }

  /** Find a leave request by id. */
  public async findById(id: string): Promise<LeaveRequest | null> {
    const result = await this.db.query<LeaveRequestRecord>(
      'SELECT * FROM leave_requests WHERE id = $1',
      [id],
    );

    const row = result.rows[0];
    return row ? this.toEntity(row) : null;
  }

  /** List leave requests for an employee. */
  public async findByEmployeeId(employeeId: string): Promise<LeaveRequest[]> {
    const result = await this.db.query<LeaveRequestRecord>(
      'SELECT * FROM leave_requests WHERE employee_id = $1 ORDER BY created_at DESC',
      [employeeId],
    );

    return result.rows.map((row) => this.toEntity(row));
  }

  private toEntity(record: LeaveRequestRecord): LeaveRequest {
    return {
      id: record.id,
      employeeId: record.employee_id,
      leaveType: record.leave_type,
      startDate: new Date(record.start_date),
      endDate: new Date(record.end_date),
      status: record.status,
      approverEmployeeId: record.approver_employee_id,
      createdAt: new Date(record.created_at),
    };
  }

  private toRecord(entity: LeaveRequest): LeaveRequestRecord {
    return {
      id: entity.id,
      employee_id: entity.employeeId,
      leave_type: entity.leaveType,
      start_date: entity.startDate,
      end_date: entity.endDate,
      status: entity.status,
      approver_employee_id: entity.approverEmployeeId,
      created_at: entity.createdAt,
    };
  }
}
