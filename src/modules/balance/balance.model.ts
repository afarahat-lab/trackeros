export interface LeaveBalance {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  year: number;
  totalDays: number;
  usedDays: number;
  remainingDays: number;
}

export interface CreateLeaveBalanceDto {
  employeeId: string;
  leaveTypeId: string;
  year: number;
  totalDays: number;
  usedDays?: number;
}
