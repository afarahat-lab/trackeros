import { AuditRecord, CreateLeaveRequestInput, LeaveRequest } from "./leave.model";

/**
 * Repository contract for leave request persistence.
 */
export interface LeaveRequestRepository {
  createLeaveRequest(input: CreateLeaveRequestInput, auditRecord: AuditRecord): Promise<LeaveRequest>;
  findById(id: string): Promise<LeaveRequest | null>;
  approveLeaveRequest(id: string, approvedBy: string, auditRecord: AuditRecord): Promise<LeaveRequest>;
  rejectLeaveRequest(id: string, rejectedBy: string, auditRecord: AuditRecord): Promise<LeaveRequest>;
  findByEmployeeId(employeeId: string): Promise<LeaveRequest[]>;
}

/**
 * PostgreSQL-backed leave request repository scaffold.
 * Concrete persistence implementation is deferred to a later phase.
 */
export class PostgreSQLLeaveRequestRepository implements LeaveRequestRepository {
  public constructor() {}

  /**
   * Creates a leave request and records an audit entry.
   */
  public async createLeaveRequest(
    input: CreateLeaveRequestInput,
    auditRecord: AuditRecord,
  ): Promise<LeaveRequest> {
    void input;
    void auditRecord;

    throw new Error("Not implemented");
  }

  /**
   * Finds a leave request by identifier.
   */
  public async findById(id: string): Promise<LeaveRequest | null> {
    void id;

    throw new Error("Not implemented");
  }

  /**
   * Approves a leave request and records an audit entry.
   */
  public async approveLeaveRequest(
    id: string,
    approvedBy: string,
    auditRecord: AuditRecord,
  ): Promise<LeaveRequest> {
    void id;
    void approvedBy;
    void auditRecord;

    throw new Error("Not implemented");
  }

  /**
   * Rejects a leave request and records an audit entry.
   */
  public async rejectLeaveRequest(
    id: string,
    rejectedBy: string,
    auditRecord: AuditRecord,
  ): Promise<LeaveRequest> {
    void id;
    void rejectedBy;
    void auditRecord;

    throw new Error("Not implemented");
  }

  /**
   * Finds all leave requests for an employee.
   */
  public async findByEmployeeId(employeeId: string): Promise<LeaveRequest[]> {
    void employeeId;

    throw new Error("Not implemented");
  }
}
