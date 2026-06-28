/**
 * Leave Management - Canonical Type Definitions
 * 
 * This file defines the foundational enumerations for the leave management module.
 * These types are the base dependency for all subsequent phases.
 */

/**
 * LeaveType - Represents the categories of leave an employee can request.
 */
export enum LeaveType {
  ANNUAL = 'ANNUAL',
  SICK = 'SICK',
  EMERGENCY = 'EMERGENCY',
}

/**
 * LeaveStatus - Represents the lifecycle states of a leave request.
 */
export enum LeaveStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}
