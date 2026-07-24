
import { LeaveType } from '../../shared/types/index';

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
  allowsNegativeBalance: boolean;
  maxConsecutiveDays: number;
  createdAt: Date;
  updatedAt: Date;
}
