export const LeaveTypeCode = {
  ANNUAL: 'annual',
  SICK: 'sick',
  EMERGENCY: 'emergency',
  UNPAID: 'unpaid',
  MATERNITY: 'maternity',
  PATERNITY: 'paternity'
} as const;

export type LeaveTypeCode = (typeof LeaveTypeCode)[keyof typeof LeaveTypeCode];

export const LeaveRequestStatus = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED'
} as const;

export type LeaveRequestStatus =
  (typeof LeaveRequestStatus)[keyof typeof LeaveRequestStatus];

export const UserRole = {
  EMPLOYEE: 'employee',
  MANAGER: 'manager',
  HR_ADMIN: 'hr_admin'
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];
