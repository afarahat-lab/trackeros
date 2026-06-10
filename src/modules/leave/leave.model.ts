/**
 * Supported leave request statuses.
 */
export type LeaveRequestStatus = "PENDING" | "APPROVED" | "REJECTED";

/**
 * Supported leave types.
 */
export type LeaveType = "ANNUAL" | "SICK" | "EMERGENCY";

/**
 * Canonical leave request entity.
 */
export interface LeaveRequest {
  id: string;
  employeeId: string;
  leaveType: LeaveType;
  startDate: Date;
  endDate: Date;
  status: LeaveRequestStatus;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Input required to create a leave request.
 */
export interface CreateLeaveRequestInput {
  id: string;
  employeeId: string;
  leaveType: LeaveType;
  startDate: Date;
  endDate: Date;
}

/**
 * Audit record for leave request state changes.
 */
export interface AuditRecord {
  entityId: string;
  entityType: "LEAVE_REQUEST";
  action: "CREATE" | "APPROVE" | "REJECT";
  performedBy: string;
  createdAt: Date;
}
