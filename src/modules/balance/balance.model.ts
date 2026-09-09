import { LeaveTypeCode } from '../../shared/types';

/**
 * A single leave balance row for one employee, one leave type, and one accrual
 * period. There is at most one row per (employeeId, leaveTypeCode, periodStart,
 * periodEnd). OPEN vs CLOSED is not stored — it is inferred from periodStart and
 * periodEnd relative to the current date (binding decision #2/#3).
 */
export interface LeaveBalance {
  id: string;
  employeeId: string;
  leaveTypeCode: LeaveTypeCode;
  periodStart: Date;
  periodEnd: Date;
  entitledDays: number;
  usedDays: number;
  pendingDays: number;
}

export type CreateLeaveBalanceInput = Omit<LeaveBalance, 'id'>;
