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
  accruedDays?: number;
  usedDays?: number;
  carriedOver?: number;
  balanceDays?: number;
}
