/**
 * Canonical leave type enumerations for the leave management system.
 * 
 * This file is the foundational type dependency for every subsequent phase
 * of the leave management module.
 */

/**
 * Enumeration of all supported leave types in the system.
 * 
 * - ANNUAL: Paid annual/vacation leave
 * - SICK: Sick leave for medical reasons
 * - EMERGENCY: Emergency leave for urgent personal matters
 */
export enum LeaveType {
  ANNUAL = 'ANNUAL',
  SICK = 'SICK',
  EMERGENCY = 'EMERGENCY',
}

/**
 * Enumeration of all possible leave request statuses.
 * 
 * - PENDING: Leave request is awaiting manager review
 * - APPROVED: Leave request has been approved by manager
 * - REJECTED: Leave request has been rejected by manager
 * - CANCELLED: Leave request has been cancelled by the employee
 */
export enum LeaveStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}
