import { LeaveType } from '../../shared/types/leave.types';

export interface LeaveBalance {
  id: string;
  employeeId: string;
  leaveType: LeaveType;
  balance: number;
  fiscalYear: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateLeaveBalanceDto {
  employeeId: string;
  leaveType: LeaveType;
  balance: number;
  fiscalYear: number;
}

export interface UpdateLeaveBalanceDto {
  balance?: number;
}
