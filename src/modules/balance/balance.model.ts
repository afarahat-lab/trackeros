export interface LeaveBalance {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  totalEntitlement: number;
  usedDays: number;
  pendingDays: number;
  year: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateLeaveBalanceDto {
  employeeId: string;
  leaveTypeId: string;
  totalEntitlement: number;
  year: number;
}
