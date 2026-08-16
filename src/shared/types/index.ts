export enum LeaveStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export enum LeaveType {
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
}

export enum NotificationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  READ = 'READ',
  ARCHIVED = 'ARCHIVED',
}

export enum EmploymentStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  TERMINATED = 'TERMINATED',
}

export interface CreateLeaveRequestDto {
  employeeId: string;
  leavePolicyId: string;
  startDate: Date;
  endDate: Date;
  reason: string | undefined;
}

export interface UpdateLeaveRequestDto {
  startDate: Date | undefined;
  endDate: Date | undefined;
  reason: string | undefined;
  status: LeaveStatus | undefined;
}

export interface LeaveRequestQueryParams {
  employeeId: string | undefined;
  status: LeaveStatus | undefined;
  leavePolicyId: string | undefined;
  startDateFrom: Date | undefined;
  startDateTo: Date | undefined;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}
