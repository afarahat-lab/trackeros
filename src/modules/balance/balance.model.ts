export interface LeaveBalance {
  id: string;
  employeeId: string;
  leaveType: 'annual' | 'sick' | 'emergency';
  totalDays: number;
  usedDays: number;
  remainingDays: number;
  year: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateLeaveBalanceDto {
  employeeId: string;
  leaveType: 'annual' | 'sick' | 'emergency';
  totalDays: number;
  year: number;
}
