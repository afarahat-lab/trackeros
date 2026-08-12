import { LeaveType } from '../../shared/types';

export interface LeavePolicy {
  id: string;
  policyName: string;
  leaveType: LeaveType;
  entitlementDays: number;
  accrualRate: number | null;
  maxAccumulation: number | null;
  minimumNoticeDays: number;
  requiresManagerApproval: boolean;
  isActive: boolean;
  isPaid: boolean;
  createdAt: Date;
  updatedAt: Date;
}
