export interface BalanceAdjustmentDto {
  employeeId: string;
  policyId: string;
  fiscalYear: number;
  adjustmentType: 'accrual' | 'usage' | 'correction';
  days: number;
  notes?: string;
}

export interface LeaveBalanceDto {
  id: string;
  employeeId: string;
  policyId: string;
  fiscalYear: number;
  accruedDays: number;
  usedDays: number;
  carriedOver: number;
  balanceDays: number;
  createdAt: Date;
  updatedAt: Date;
}
