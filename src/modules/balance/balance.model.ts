import { LeaveType } from '../../shared/types';

export interface LeaveBalance {
  id: string;
  employeeId: string;
  leaveType: LeaveType;
  totalDays: number;
  usedDays: number;
  remainingDays: number;
  year: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateLeaveBalanceDto {
  employeeId: string;
  leaveType: LeaveType;
  totalDays: number;
  year: number;
}
