export interface LeaveBalance {
  id: string;
  employeeId: string;
  policyId: string;
  balanceDays: number;
  fiscalYear: number;
  createdAt: Date;
  updatedAt: Date;
}
