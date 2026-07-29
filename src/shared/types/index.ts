// Enums
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

export enum BalanceStatus {
  ACTIVE = 'ACTIVE',
  EXHAUSTED = 'EXHAUSTED',
  FROZEN = 'FROZEN',
  CLOSED = 'CLOSED',
}

export enum LeavePolicyStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export enum EmploymentStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  TERMINATED = 'TERMINATED',
}

// DTOs
export interface CreateLeaveRequestDto {
  employeeId: string;
  leavePolicyId: string;
  startDate: string;
  endDate: string;
  reason: string | undefined;
}

export interface UpdateLeaveRequestDto {
  status?: LeaveRequestStatus | undefined;
  approvedBy?: string | undefined;
  reason?: string | undefined;
}
