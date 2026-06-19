export interface LeaveBalance {
  id: string;
  employeeId: string;
  policyId: string;
  totalEntitlement: number;
  usedDays: number;
  remainingDays: number;
  fiscalYear: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeaveBalanceQueryParams {
  employeeId?: string;
  policyId?: string;
  fiscalYear?: number;
  status?: string;
}
