import { LeaveType } from '../../shared/types/index';

export interface LeavePolicy {
  id: string;
  policyName: string;
  leaveType: LeaveType;
  entitlementDays: number;
  accrualRate: number | undefined;
  maxAccumulation: number | undefined;
  minimumNoticeDays: number | undefined;
  requiresManagerApproval: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
