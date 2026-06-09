export enum LeaveType {
  Annual = 'annual',
  Sick = 'sick',
  Emergency = 'emergency',
}

export interface LeaveBalance {
  employeeId: string;
  leaveType: LeaveType;
  totalDays: number;
  usedDays: number;
  pendingDays: number;
  year: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateOrUpdateLeaveBalanceDto {
  employeeId: string;
  leaveType: LeaveType;
  totalDays: number;
  year: number;
  usedDays?: number;
  pendingDays?: number;
}

export interface BalanceAdjustmentDto {
  employeeId: string;
  leaveType: LeaveType;
  days: number;
  year: number;
}
