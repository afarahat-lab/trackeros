export enum LeaveType {
  ANNUAL = 'annual',
  SICK = 'sick',
  EMERGENCY = 'emergency',
  UNPAID = 'unpaid',
  MATERNITY = 'maternity',
  PATERNITY = 'paternity',
}

export enum LeaveStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export enum EmploymentStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  TERMINATED = 'TERMINATED',
}

export enum AuditAction {
  CREATED = 'CREATED',
  UPDATED = 'UPDATED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
  BALANCE_DEDUCTED = 'BALANCE_DEDUCTED',
  BALANCE_RESTORED = 'BALANCE_RESTORED',
}

export enum NotificationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
}

export interface CreateLeaveRequestDto {
  employeeId: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  reason: string | undefined;
}

export interface UpdateLeaveRequestDto {
  status: LeaveStatus;
  approverId: string | null;
}

export interface LeaveRequestQueryParams {
  employeeId: string | undefined;
  leaveType: LeaveType | undefined;
  status: LeaveStatus | undefined;
  startDate: string | undefined;
  endDate: string | undefined;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}
