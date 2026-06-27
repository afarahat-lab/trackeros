/**
 * Shared enums for the leave management module.
 * These enums define the domain vocabulary used across all leave-related modules.
 */

/** Types of leave an employee can request */
export enum LeaveType {
  ANNUAL = 'ANNUAL',
  SICK = 'SICK',
  MATERNITY = 'MATERNITY',
  PATERNITY = 'PATERNITY',
  UNPAID = 'UNPAID',
  OTHER = 'OTHER',
}

/** Status of a leave request */
export enum LeaveStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

/** Types of notifications sent during leave workflow */
export enum NotificationType {
  LEAVE_REQUEST_CREATED = 'LEAVE_REQUEST_CREATED',
  LEAVE_REQUEST_APPROVED = 'LEAVE_REQUEST_APPROVED',
  LEAVE_REQUEST_REJECTED = 'LEAVE_REQUEST_REJECTED',
  LEAVE_REQUEST_CANCELLED = 'LEAVE_REQUEST_CANCELLED',
  LEAVE_BALANCE_LOW = 'LEAVE_BALANCE_LOW',
  LEAVE_BALANCE_EXPIRING = 'LEAVE_BALANCE_EXPIRING',
}

/** Actions recorded in the audit trail */
export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
}

/** Entity types that can be audited */
export enum EntityType {
  LEAVE_REQUEST = 'LEAVE_REQUEST',
  LEAVE_BALANCE = 'LEAVE_BALANCE',
  LEAVE_POLICY = 'LEAVE_POLICY',
  EMPLOYEE = 'EMPLOYEE',
  NOTIFICATION = 'NOTIFICATION',
}
