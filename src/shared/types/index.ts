export type LeaveTypeCode = 'annual' | 'sick' | 'emergency' | 'unpaid' | 'maternity' | 'paternity';

export interface LeaveType {
  code: LeaveTypeCode;
  label: string;
  requiresDocumentation: boolean;
  isPaid: boolean;
}

export const LEAVE_TYPES: Record<LeaveTypeCode, LeaveType> = {
  annual: {
    code: 'annual',
    label: 'Annual Leave',
    requiresDocumentation: false,
    isPaid: true,
  },
  sick: {
    code: 'sick',
    label: 'Sick Leave',
    requiresDocumentation: true,
    isPaid: true,
  },
  emergency: {
    code: 'emergency',
    label: 'Emergency Leave',
    requiresDocumentation: false,
    isPaid: true,
  },
  unpaid: {
    code: 'unpaid',
    label: 'Unpaid Leave',
    requiresDocumentation: false,
    isPaid: false,
  },
  maternity: {
    code: 'maternity',
    label: 'Maternity Leave',
    requiresDocumentation: true,
    isPaid: true,
  },
  paternity: {
    code: 'paternity',
    label: 'Paternity Leave',
    requiresDocumentation: true,
    isPaid: true,
  },
};

export enum LeaveStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export enum UserRole {
  EMPLOYEE = 'employee',
  MANAGER = 'manager',
  HR_ADMIN = 'hr_admin',
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginationResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
