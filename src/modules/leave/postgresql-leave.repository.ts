import pool from "../../shared/db/connection";
import type { LeaveRequest } from "./leave.model";
import type { LeaveRequestRepository } from "./leave.repository";

interface LeaveRequestRow {
  id: string;
  employee_id: string;
  leave_type: string;
  start_date: Date;
  end_date: Date;
  status: string;
  created_at: Date;
  updated_at: Date;
}

/** PostgreSQL implementation of LeaveRequestRepository. */
export class PostgreSqlLeaveRequestRepository implements LeaveRequestRepository {
  public async create(leaveRequest: LeaveRequest): Promise<LeaveRequest> {
    try {
      const result = await pool.query<LeaveRequestRow>(
        `INSERT INTO leave_requests (
          id, employee_id, leave_type, start_date, end_date, status, created_at, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        RETURNING *`,
        [
          leaveRequest.id,
          leaveRequest.employeeId,
          leaveRequest.leaveType,
          leaveRequest.startDate,
          leaveRequest.endDate,
          leaveRequest.status,
          leaveRequest.createdAt,
          leaveRequest.updatedAt
        ]
      );

      return this.mapRow(result.rows[0]);
    } catch (error: unknown) {
      throw new Error(`LeaveRequestRepository#create failed: ${error instanceof Error ? error.message : "unknown error"}`);
    }
  }

  public async findById(id: string): Promise<LeaveRequest | null> {
    try {
      const result = await pool.query<LeaveRequestRow>("SELECT * FROM leave_requests WHERE id = $1", [id]);
      return result.rows[0] ? this.mapRow(result.rows[0]) : null;
    } catch (error: unknown) {
      throw new Error(`LeaveRequestRepository#findById failed: ${error instanceof Error ? error.message : "unknown error"}`);
    }
  }

  public async findByEmployeeId(employeeId: string): Promise<LeaveRequest[]> {
    try {
      const result = await pool.query<LeaveRequestRow>(
        "SELECT * FROM leave_requests WHERE employee_id = $1 ORDER BY created_at DESC",
        [employeeId]
      );

      return result.rows.map((row) => this.mapRow(row));
    } catch (error: unknown) {
      throw new Error(`LeaveRequestRepository#findByEmployeeId failed: ${error instanceof Error ? error.message : "unknown error"}`);
    }
  }

  public async update(leaveRequest: LeaveRequest): Promise<LeaveRequest> {
    try {
      const result = await pool.query<LeaveRequestRow>(
        `UPDATE leave_requests
         SET employee_id = $2,
             leave_type = $3,
             start_date = $4,
             end_date = $5,
             status = $6,
             created_at = $7,
             updated_at = $8
         WHERE id = $1
         RETURNING *`,
        [
          leaveRequest.id,
          leaveRequest.employeeId,
          leaveRequest.leaveType,
          leaveRequest.startDate,
          leaveRequest.endDate,
          leaveRequest.status,
          leaveRequest.createdAt,
          leaveRequest.updatedAt
        ]
      );

      return this.mapRow(result.rows[0]);
    } catch (error: unknown) {
      throw new Error(`LeaveRequestRepository#update failed: ${error instanceof Error ? error.message : "unknown error"}`);
    }
  }

  private mapRow(row: LeaveRequestRow): LeaveRequest {
    return {
      id: row.id,
      employeeId: row.employee_id,
      leaveType: row.leave_type as LeaveRequest["leaveType"],
      startDate: new Date(row.start_date),
      endDate: new Date(row.end_date),
      status: row.status as LeaveRequest["status"],
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
}
