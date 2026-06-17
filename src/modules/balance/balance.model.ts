export interface LeaveBalance {
  id: string;
  employeeId: string;
  policyId: string;
  fiscalYear: number;
  totalDays: number;
  usedDays: number;
  remainingDays: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeaveBalanceQuery {
  employeeId?: string;
  policyId?: string;
  fiscalYear?: number;
}
