import { LeaveType, LeaveBalanceStatus } from '../../shared/types/leave.types';

export interface LeaveBalance {
  id: string;
  employeeId: string;
  leaveType: LeaveType;
  leavePolicyId: string;
  entitled: number;
  used: number;
  pending: number;
  carriedOver: number;
  remaining: number;
  year: number;
  status: LeaveBalanceStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateLeaveBalanceDto {
  employeeId: string;
  leaveType: LeaveType;
  leavePolicyId: string;
  entitled: number;
  used: number;
  pending: number;
  carriedOver: number;
  remaining: number;
  year: number;
  status: LeaveBalanceStatus;
}
