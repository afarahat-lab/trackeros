export enum LeaveType {
  ANNUAL = 'annual',
  SICK = 'sick',
  EMERGENCY = 'emergency',
  UNPAID = 'unpaid',
  MATERNITY = 'maternity',
  PATERNITY = 'paternity',
}

export enum LeaveRequestStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export type LeaveStatus = LeaveRequestStatus;

export enum EmploymentStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  TERMINATED = 'TERMINATED',
}

export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
}

export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateLeaveRequestDto {
  employeeId: string;
  policyId: string;
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
  policyId?: string;
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
