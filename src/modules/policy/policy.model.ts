import { LeaveType } from '../../shared/types/leave.types';

export interface LeavePolicy {
  id: string;
  policyName: string;
  leaveType: LeaveType;
  entitlementDays: number;
  accrualRate: number;
  maxAccumulation: number;
  minimumNoticeDays: number;
  requiresManagerApproval: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type LeavePolicyQueryParams = Partial<Pick<LeavePolicy, 'leaveType' | 'isActive'>>;
