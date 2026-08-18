
export interface LeaveBalance {
  id: string;
  employeeId: string;
  leavePolicyId: string;
  totalEntitlement: number;
  usedDays: number;
  remainingDays: number;
  fiscalYear: number;
  status: 'ACTIVE' | 'CLOSED';
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateLeaveBalanceDto {
  employeeId: string;
  leavePolicyId: string;
  totalEntitlement: number;
  fiscalYear: number;
}

export interface UpdateLeaveBalanceDto {
  usedDays?: number;
  remainingDays?: number;
  status?: 'ACTIVE' | 'CLOSED';
}
