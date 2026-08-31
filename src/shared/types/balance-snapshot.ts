import { LeaveType } from './leave-type';

export interface BalanceSnapshot {
  employeeId: string;
  leaveType: LeaveType;
  entitlementDays: number;
  usedDays: number;
  pendingDays: number;
  availableDays: number;
  fiscalYear: number;
}
