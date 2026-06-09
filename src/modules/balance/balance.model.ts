export enum LeaveType {
  Annual = 'annual',
  Sick = 'sick',
  Emergency = 'emergency',
}

export interface LeaveBalance {
  employeeId: string;
  leaveType: LeaveType;
  entitlement: number;
  pending: number;
  used: number;
  periodStart: Date;
  periodEnd: Date;
}

export interface CreateOrUpdateLeaveBalanceDto {
  employeeId: string;
  leaveType: LeaveType;
  entitlement: number;
  pending?: number;
  used?: number;
  periodStart: Date;
  periodEnd: Date;
}

export interface BalanceAdjustmentDto {
  employeeId: string;
  leaveType: LeaveType;
  amount: number;
}
