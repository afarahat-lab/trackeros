import { LeaveBalance } from './leave-balance.model';

export interface ILeaveBalanceService {
  getBalance(
    employeeId: string,
    leavePolicyId: string,
    fiscalYear: number,
  ): Promise<LeaveBalance & { remainingDays: number }>;
  deductDays(
    employeeId: string,
    leavePolicyId: string,
    fiscalYear: number,
    days: number,
  ): Promise<void>;
  restoreDays(
    employeeId: string,
    leavePolicyId: string,
    fiscalYear: number,
    days: number,
  ): Promise<void>;
}
