import { LeaveType } from './leave-type.model';

export interface LeavePolicy {
  id: string;
  policyName: string;
  leaveTypeId: string;
  entitlementDays: number;
  accrualRate: number;
  maxAccumulation: number;
  minimumNoticeDays: number;
  requiresManagerApproval: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateLeavePolicyDto {
  policyName: string;
  leaveTypeId: string;
  entitlementDays: number;
  accrualRate: number;
  maxAccumulation: number;
  minimumNoticeDays: number;
  requiresManagerApproval?: boolean;
  isActive?: boolean;
}
