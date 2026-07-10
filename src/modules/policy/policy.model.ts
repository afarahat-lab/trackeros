import { LeaveType } from '../../shared/types';

export interface LeavePolicy {
  id: number;
  policyName: string;
  leaveType: LeaveType;
  entitlementDays: number;
  accrualRate?: number;
  maxAccumulation?: number;
  minimumNoticeDays?: number;
  requiresManagerApproval: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateLeavePolicyDto = Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>;

export type UpdateLeavePolicyDto = Partial<Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>>;
