import type { BaseEntity } from '../../shared/types/base-entity.interface';

export type LeaveBalanceStatus = 'ACTIVE' | 'EXHAUSTED' | 'CLOSED';

export interface LeaveBalance extends BaseEntity {
  employeeId: string;
  leavePolicyId: string;
  totalEntitlement: number;
  usedDays: number;
  fiscalYear: number;
  status: LeaveBalanceStatus;
}

export interface LeaveBalanceWithRemaining extends LeaveBalance {
  remainingDays: number;
}
