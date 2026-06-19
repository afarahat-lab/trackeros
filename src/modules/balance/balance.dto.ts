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

export interface UpdateLeaveBalanceDto {
  balanceId: string;
  accruedDays?: number;
  usedDays?: number;
  carriedOver?: number;
}
