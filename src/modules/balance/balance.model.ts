export interface LeaveBalance {
  id: string;
  employeeId: string;
  policyId: string;
  balanceDays: number;
  accrualDate: Date;
  expiryDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeaveBalanceQuery {
  employeeId?: string;
  policyId?: string;
  accrualDateFrom?: Date;
  accrualDateTo?: Date;
  expiryDateFrom?: Date;
  expiryDateTo?: Date;
  balanceDaysMin?: number;
  balanceDaysMax?: number;
  limit?: number;
  offset?: number;
}
