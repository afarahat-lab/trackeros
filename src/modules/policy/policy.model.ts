
import { LeaveType } from '../../shared/types/leave.types';

export interface LeavePolicy {
  id: number;
  policyName: string;
  leaveType: LeaveType;
  entitlementDays: number;
  accrualRate: number;
  maxAccumulation: number;
  minimumNoticeDays: number;
  requiresManagerApproval: boolean;
  isActive: boolean;
  allowNegativeBalance: boolean;
  maxConsecutiveDays: number;
  fiscalYear: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeavePolicyQueryParams {
  leaveType?: LeaveType;
  isActive?: boolean;
  fiscalYear?: number;
}
