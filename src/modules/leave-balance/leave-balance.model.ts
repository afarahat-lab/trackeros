export interface LeaveBalance {
  id: string;
  employeeId: string;
  leavePolicyId: string;
  totalEntitlement: number;
  usedDays: number;
  remainingDays: number;
  fiscalYear: number;
  status: 'ACTIVE' | 'EXHAUSTED' | 'CLOSED';
  createdAt: Date;
  updatedAt: Date;
}
