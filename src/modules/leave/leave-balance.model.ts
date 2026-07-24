import { BalanceStatus } from '../../shared/types/index';

export interface LeaveBalance {
  id: string;
  employeeId: string;
  policyId: string;
  totalEntitlement: number;
  usedDays: number;
  remainingDays: number;
  pendingDays: number;
  fiscalYear: number;
  status: BalanceStatus;
  createdAt: Date;
  updatedAt: Date;
}
