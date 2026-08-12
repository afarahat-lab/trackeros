export interface LeaveBalance {
  id: string;
  employeeId: string;
  policyId: string;
  fiscalYear: number;
  totalEntitlement: number;
  usedDays: number;
  remainingDays: number;
  status: 'ACTIVE' | 'EXHAUSTED' | 'CLOSED';
  createdAt: Date;
  updatedAt: Date;
}
