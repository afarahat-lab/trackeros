export enum BalanceStatus {
  ACTIVE = 'ACTIVE',
  EXHAUSTED = 'EXHAUSTED',
  CLOSED = 'CLOSED',
}

export interface LeaveBalance {
  id: string;
  employeeId: string;
  leavePolicyId: string;
  totalEntitlement: number;
  usedDays: number;
  remainingDays: number;
  fiscalYear: number;
  status: BalanceStatus;
  createdAt: Date;
  updatedAt: Date;
}
