import { BaseEntity, LeaveType } from 'shared/types';

export interface LeavePolicy extends BaseEntity {
  policyName: string;
  leaveType: LeaveType;
  entitlementDays: number;
  accrualRate: number | undefined;
  maxAccumulation: number | undefined;
  minimumNoticeDays: number | undefined;
  requiresManagerApproval: boolean;
  isActive: boolean;
}
