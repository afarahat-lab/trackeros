import { LeaveType } from '../../shared/types/leave.types';

export interface LeavePolicy {
  id: string;
  leaveType: LeaveType;
  entitlementDays: number;
  carryOverLimit: number;
  requiresApproval: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateLeavePolicyDto {
  leaveType: LeaveType;
  entitlementDays: number;
  carryOverLimit: number;
  requiresApproval: boolean;
}

export interface UpdateLeavePolicyDto {
  leaveType?: LeaveType;
  entitlementDays?: number;
  carryOverLimit?: number;
  requiresApproval?: boolean;
}
