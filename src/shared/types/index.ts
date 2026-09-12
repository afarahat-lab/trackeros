/**
 * Canonical shared value types and cross-module DTOs (reconciled architecture,
 * DOMAIN.md). These are the persisted string values consumed by every later
 * module, so the public entry point below is authoritative.
 */

export enum LeaveStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export enum LeaveTypeCode {
  ANNUAL = 'annual',
  SICK = 'sick',
  EMERGENCY = 'emergency',
  UNPAID = 'unpaid',
  MATERNITY = 'maternity',
  PATERNITY = 'paternity',
}

export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  CANCEL = 'CANCEL',
}

export enum NotificationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  READ = 'READ',
  ARCHIVED = 'ARCHIVED',
}

export enum EmploymentStatus {
  ACTIVE = 'ACTIVE',
  TERMINATED = 'TERMINATED',
  ON_LEAVE = 'ON_LEAVE',
}

export enum EmployeeRole {
  EMPLOYEE = 'EMPLOYEE',
  MANAGER = 'MANAGER',
  ADMIN = 'ADMIN',
}

export interface CreateLeaveRequestDto {
  employeeId: string;
  leaveTypeCode: LeaveTypeCode;
  startDate: Date;
  endDate: Date;
  reason?: string;
}

export interface UpdateLeaveRequestDto {
  startDate?: Date;
  endDate?: Date;
  reason?: string;
  status?: LeaveStatus;
  approverId?: string;
  decidedAt?: Date;
}

export interface LeaveRequestQueryParams {
  status?: LeaveStatus;
  leaveTypeCode?: LeaveTypeCode;
  startDateFrom?: Date;
  startDateTo?: Date;
  endDateFrom?: Date;
  endDateTo?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Canonical inclusive calendar-day count: requestedDays = endDate - startDate + 1.
 * Whole-day only, no weekend/public-holiday exclusion (binding decision #1/#10).
 * Implemented once here and called from every consumer — never re-derived.
 */
export function requestedDays(startDate: Date, endDate: Date): number {
  const MS_PER_DAY = 86_400_000;
  const utcStart = Date.UTC(
    startDate.getUTCFullYear(),
    startDate.getUTCMonth(),
    startDate.getUTCDate()
  );
  const utcEnd = Date.UTC(
    endDate.getUTCFullYear(),
    endDate.getUTCMonth(),
    endDate.getUTCDate()
  );
  return Math.round((utcEnd - utcStart) / MS_PER_DAY) + 1;
}
