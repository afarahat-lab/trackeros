export interface LeaveBalance {
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
