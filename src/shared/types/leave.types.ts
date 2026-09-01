/**
 * Shared domain types for the leave feature.
 *
 * These enums, DTOs and the ValidationResult value object are owned by the
 * shared-types module and are imported by every domain module that needs them.
 */

export enum LeaveType {
  annual = 'annual',
  sick = 'sick',
  emergency = 'emergency',
  unpaid = 'unpaid',
  maternity = 'maternity',
  paternity = 'paternity',
}

export enum LeaveStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export enum EmploymentStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  TERMINATED = 'TERMINATED',
}

export enum NotificationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  READ = 'READ',
  ARCHIVED = 'ARCHIVED',
}

export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
}

export enum UserRole {
  employee = 'employee',
  manager = 'manager',
  hr_admin = 'hr_admin',
}

export interface CreateLeaveRequestDto {
  employeeId: string;
  leaveType: LeaveType;
  startDate: Date;
  endDate: Date;
  reason?: string;
}

export interface UpdateLeaveRequestDto {
  startDate?: Date;
  endDate?: Date;
  reason?: string;
}

export interface LeaveRequestQueryParams {
  status?: LeaveStatus;
  leaveType?: LeaveType;
  startDateFrom?: Date;
  startDateTo?: Date;
  endDateFrom?: Date;
  endDateTo?: Date;
  limit?: number;
  offset?: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}
