import { randomUUID } from 'crypto';
import type { Pool } from 'pg';
import { AuditRepository } from '../audit/audit.repository';
import { CreateLeaveRequestDto, LeaveRequest, LeaveRequestStatus } from './leave.model';

export interface LeaveRepository {
  createLeaveRequest(dto: CreateLeaveRequestDto): Promise<LeaveRequest>;
  findById(id: string): Promise<LeaveRequest | null>;
  updateStatus(id: string, status: LeaveRequestStatus): Promise<LeaveRequest>;
}

export class PostgreSqlLeaveRepository implements LeaveRepository {
  public constructor(
    private readonly pool: Pool,
    private readonly auditRepository: AuditRepository
  ) {}

  /** Creates a leave request and audit record. */
  public async createLeaveRequest(dto: CreateLeaveRequestDto): Promise<LeaveRequest> {
    const leaveRequest: LeaveRequest = {
      id: randomUUID(),
      employeeId: dto.employeeId,
      leaveType: dto.leaveType,
      status: 'PENDING'
    };

    await this.pool.query(
      'INSERT INTO leave_requests (id, employee_id, leave_type, status) VALUES ($1, $2, $3, $4)',
      [leaveRequest.id, leaveRequest.employeeId, leaveRequest.leaveType, leaveRequest.status]
    );

    await this.auditRepository.createAuditRecord({
      entityType: 'LeaveRequest',
      entityId: leaveRequest.id,
      action: 'CREATED'
    });

    return leaveRequest;
  }

  /** Finds a leave request by id. */
  public async findById(id: string): Promise<LeaveRequest | null> {
    const result = await this.pool.query(
      'SELECT id, employee_id, leave_type, status FROM leave_requests WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0] as {
      id: string;
      employee_id: string;
      leave_type: LeaveRequest['leaveType'];
      status: LeaveRequestStatus;
    };

    return {
      id: row.id,
      employeeId: row.employee_id,
      leaveType: row.leave_type,
      status: row.status
    };
  }

  /** Updates leave request status and writes audit. */
  public async updateStatus(id: string, status: LeaveRequestStatus): Promise<LeaveRequest> {
    const result = await this.pool.query(
      'UPDATE leave_requests SET status = $2 WHERE id = $1 RETURNING id, employee_id, leave_type, status',
      [id, status]
    );

    const row = result.rows[0] as {
      id: string;
      employee_id: string;
      leave_type: LeaveRequest['leaveType'];
      status: LeaveRequestStatus;
    };

    await this.auditRepository.createAuditRecord({
      entityType: 'LeaveRequest',
      entityId: id,
      action: status === 'APPROVED' ? 'APPROVED' : 'REJECTED'
    });

    return {
      id: row.id,
      employeeId: row.employee_id,
      leaveType: row.leave_type,
      status: row.status
    };
  }
}
