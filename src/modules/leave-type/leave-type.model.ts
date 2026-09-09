import { LeaveTypeCode } from '../../shared/types';

export interface LeaveType {
  code: LeaveTypeCode;
  name: string;
  requiresApproval: boolean;
  maxConsecutiveDays: number;
  isPaid: boolean;
}

export type CreateLeaveTypeInput = LeaveType;
