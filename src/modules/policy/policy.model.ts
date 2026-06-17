export type LeaveType = 'ANNUAL' | 'SICK' | 'PERSONAL' | 'MATERNITY' | 'PATERNITY';

export interface LeavePolicy {
  id: string;
  name: string;
  leaveType: LeaveType;
  maxDaysPerYear: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeavePolicyQuery {
  leaveType?: LeaveType;
  isActive?: boolean;
}
