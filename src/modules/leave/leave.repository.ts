import { randomUUID } from "crypto";
import type { Pool } from "pg";
import { AuditRecordRepository } from "../audit/audit.repository";
import type { CreateLeaveRequestDTO, LeaveRequest, LeaveRequestStatus } from "./leave.model";

export interface LeaveRequestRepository {
  create(data: CreateLeaveRequestDTO): Promise<LeaveRequest>;
  findById(id: string): Promise<LeaveRequest | null>;
  updateStatus(id: string, status: LeaveRequestStatus): Promise<LeaveRequest>;
  delete(id: string): Promise<void>;
}

export class PostgreSqlLeaveRequestRepository implements LeaveRequestRepository {
  public constructor(
    private readonly pool: Pool,
    private readonly auditRepository: AuditRecordRepository
  ) {}

  /** Creates a leave request. */
  public async create(data: CreateLeaveRequestDTO): Promise<LeaveRequest> {
    try {
      const leaveRequest: LeaveRequest = {
        id: randomUUID(),
        employeeId: data.employeeId,
        leaveType: data.leaveType,
        startDate: data.startDate,
        endDate: data.endDate,
        status: "PENDING",
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await this.pool.query(
        `INSERT INTO leave_requests
        (id, employee_id, leave_type, start_date, end_date, status, created_at, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [leaveRequest.id, leaveRequest.employeeId, leaveRequest.leaveType, leaveRequest.startDate, leaveRequest.endDate, leaveRequest.status, leaveRequest.createdAt, leaveRequest.updatedAt]
      );

      await this.auditRepository.create({
        id: randomUUID(),
        entityType: "LeaveRequest",
        entityId: leaveRequest.id,
        action: "CREATE",
        createdAt: new Date()
      });

      return leaveRequest;
    } catch (error: unknown) {
      throw new Error(`LEAVE_REQUEST_CREATE_FAILED:${error instanceof Error ? error.message : "unknown_error"}`);
    }
  }

  /** Finds a leave request by id. */
  public async findById(id: string): Promise<LeaveRequest | null> {
    try {
      const result = await this.pool.query(`SELECT * FROM leave_requests WHERE id = $1`, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0] as Record<string, unknown>;

      return {
        id: String(row.id),
        employeeId: String(row.employee_id),
        leaveType: row.leave_type as LeaveRequest["leaveType"],
        startDate: new Date(String(row.start_date)),
        endDate: new Date(String(row.end_date)),
        status: row.status as LeaveRequestStatus,
        createdAt: new Date(String(row.created_at)),
        updatedAt: new Date(String(row.updated_at))
      };
    } catch (error: unknown) {
      throw new Error(`LEAVE_REQUEST_READ_FAILED:${error instanceof Error ? error.message : "unknown_error"}`);
    }
  }

  /** Updates leave request status. */
  public async updateStatus(id: string, status: LeaveRequestStatus): Promise<LeaveRequest> {
    try {
      const result = await this.pool.query(
        `UPDATE leave_requests SET status = $2, updated_at = $3 WHERE id = $1 RETURNING *`,
        [id, status, new Date()]
      );

      if (result.rows.length === 0) {
        throw new Error(`LeaveRequest not found: ${id}`);
      }

      await this.auditRepository.create({
        id: randomUUID(),
        entityType: "LeaveRequest",
        entityId: id,
        action: `STATUS_${status}`,
        createdAt: new Date()
      });

      const row = result.rows[0] as Record<string, unknown>;
      return {
        id: String(row.id),
        employeeId: String(row.employee_id),
        leaveType: row.leave_type as LeaveRequest["leaveType"],
        startDate: new Date(String(row.start_date)),
        endDate: new Date(String(row.end_date)),
        status: row.status as LeaveRequestStatus,
        createdAt: new Date(String(row.created_at)),
        updatedAt: new Date(String(row.updated_at))
      };
    } catch (error: unknown) {
      throw new Error(`LEAVE_REQUEST_UPDATE_FAILED:${error instanceof Error ? error.message : "unknown_error"}`);
    }
  }

  /** Deletes a leave request. */
  public async delete(id: string): Promise<void> {
    try {
      await this.pool.query(`DELETE FROM leave_requests WHERE id = $1`, [id]);

      await this.auditRepository.create({
        id: randomUUID(),
        entityType: "LeaveRequest",
        entityId: id,
        action: "DELETE",
        createdAt: new Date()
      });
    } catch (error: unknown) {
      throw new Error(`LEAVE_REQUEST_DELETE_FAILED:${error instanceof Error ? error.message : "unknown_error"}`);
    }
  }
}
