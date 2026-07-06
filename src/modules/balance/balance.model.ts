
export interface LeaveBalance {
  id: number;
  employeeId: number;
  policyId: number;
  totalEntitlement: number;
  usedDays: number;
  pendingDays: number;
  availableDays: number;
  fiscalYear: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeaveBalanceQueryParams {
  employeeId?: number;
  policyId?: number;
  fiscalYear?: number;
}
