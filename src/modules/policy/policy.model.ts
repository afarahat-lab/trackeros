import { LeaveType } from '../../shared/types';

export interface LeavePolicy {
  id: string;
  name: string;
  leaveType: LeaveType;
  maxDaysPerYear: number;
  requiresApproval: boolean;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateLeavePolicyDto {
  name: string;
  leaveType: LeaveType;
  maxDaysPerYear: number;
  requiresApproval: boolean;
  description?: string;
}
