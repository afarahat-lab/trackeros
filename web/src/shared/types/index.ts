export enum EmployeeRole {
  EMPLOYEE = 'EMPLOYEE',
  MANAGER = 'MANAGER',
  ADMIN = 'ADMIN',
}

export enum LeaveTypeCode {
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
  TERMINATED = 'TERMINATED',
  ON_LEAVE = 'ON_LEAVE',
}

export enum AuthSessionStatus {
  ANONYMOUS = 'ANONYMOUS',
  AUTHENTICATED = 'AUTHENTICATED',
  EXPIRED = 'EXPIRED',
}

export interface EmployeeProfile {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  role: EmployeeRole;
  managerId: string | null;
  department: string;
  hireDate: Date;
  employmentStatus: EmploymentStatus;
}

export interface LeaveBalanceView {
  id: string;
  employeeId: string;
  leaveTypeCode: LeaveTypeCode;
  periodStart: Date;
  periodEnd: Date;
  entitledDays: number;
  usedDays: number;
  pendingDays: number;
  available: number;
}

export interface LeaveRequestView {
  id: string;
  employeeId: string;
  leaveTypeCode: LeaveTypeCode;
  startDate: Date;
  endDate: Date;
  requestedDays: number;
  reason: string | null;
  status: LeaveStatus;
  approverId: string | null;
  approvalComment: string | null;
  submittedAt: Date | null;
  decidedAt: Date | null;
  cancelledBy: string | null;
  cancelledAt: Date | null;
}

export interface LoginResponse {
  token: string;
  profile: EmployeeProfile;
}

export interface CreateLeaveRequestInput {
  leaveTypeCode: LeaveTypeCode;
  startDate: string;
  endDate: string;
}
