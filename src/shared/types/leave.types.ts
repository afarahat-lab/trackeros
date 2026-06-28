/**
 * Canonical enumerations for the leave management module.
 *
 * These enums are the foundational type dependency for every subsequent phase
 * of the leave management feature. They define the allowed leave types and
 * the lifecycle states of a leave request.
 */

/**
 * The types of leave an employee can request.
 */
export enum LeaveType {
  ANNUAL = 'ANNUAL',
  SICK = 'SICK',
  EMERGENCY = 'EMERGENCY',
}

/**
 * The possible statuses of a leave request throughout its lifecycle.
 */
export enum LeaveStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}
