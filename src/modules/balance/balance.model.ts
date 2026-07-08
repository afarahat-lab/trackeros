import { BalanceStatus } from '../../shared/types/leave.types';

export interface LeaveBalance {
  id: string;
  employeeId: string;
  leavePolicyId: string;
  totalEntitlement: number;
  usedDays: number;
  remainingDays: number;
  pendingDays: number;
  fiscalYear: number;
  status: BalanceStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type LeaveBalanceQueryParams = Partial<Pick<LeaveBalance, 'employeeId' | 'leavePolicyId' | 'fiscalYear' | 'status'>>;
