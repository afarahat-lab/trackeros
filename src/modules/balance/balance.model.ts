export interface LeaveBalance {
  id: string;
  employeeId: string;
  policyId: string;
  balanceYear: number;
  availableDays: number;
  usedDays: number;
  pendingDays: number;
  carriedOverDays: number;
  createdAt: Date;
  updatedAt: Date;
}
