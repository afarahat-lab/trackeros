import type { Pool } from "pg";
import pool from "../../shared/db/connection";
import { LeaveRequest, LeaveRequestRecord } from "./leave.model";
import { LeaveRepository } from "./leave.repository";

/**
 * PostgreSQL implementation of the leave repository.
 */
export class PostgresLeaveRepository implements LeaveRepository {
  public constructor(private readonly db: Pool = pool) {}

  /**
   * Persists a leave request.
   */
  public async create(leaveRequest: LeaveRequest): Promise<LeaveRequest> {
    try {
      const query = `
        INSERT INTO leave_requests (
          id, employee_id, leave_type, start_date, end_date,
          status, approver_employee_id, created_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        RETURNING *
      `;

      const result = await this.db.query<LeaveRequestRecord>(query, [
        leaveRequest.id,
        leaveRequest.employeeId,
        leaveRequest.leaveType,
        leaveRequest.startDate,
        leaveRequest.endDate,
        leaveRequest.status,
        leaveRequest.approverEmployeeId,
        leaveRequest.createdAt,
      ]);

      return this.mapRecord(result.rows[0]);
    } catch (error: unknown) {
      throw new Error(
        `LEAVE_REPOSITORY_CREATE_FAILED:${error instanceof Error ? error.message : "unknown"}`,
      );
    }
  }

  /**
   * Finds a leave request by identifier.
   */
  public async findById(id: string): Promise<LeaveRequest | null> {
    try {
      const result = await this.db.query<LeaveRequestRecord>(
        "SELECT * FROM leave_requests WHERE id = $1",
        [id],
      );

      return result.rows.length > 0 ? this.mapRecord(result.rows[0]) : null;
    } catch (error: unknown) {
      throw new Error(
        `LEAVE_REPOSITORY_FIND_BY_ID_FAILED:${error instanceof Error ? error.message : "unknown"}`,
      );
    }
  }

  /**
   * Finds leave requests for an employee.
   */
  public async findByEmployeeId(employeeId: string): Promise<LeaveRequest[]> {
    try {
      const result = await this.db.query<LeaveRequestRecord>(
        "SELECT * FROM leave_requests WHERE employee_id = $1 ORDER BY created_at DESC",
        [employeeId],
      );

      return result.rows.map((row) => this.mapRecord(row));
    } catch (error: unknown) {
      throw new Error(
        `LEAVE_REPOSITORY_FIND_BY_EMPLOYEE_FAILED:${error instanceof Error ? error.message : "unknown"}`,
      );
    }
  }

  private mapRecord(record: LeaveRequestRecord): LeaveRequest {
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
}
