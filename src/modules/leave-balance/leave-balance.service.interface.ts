import { LeaveBalance } from './leave-balance.model';

export interface ILeaveBalanceService {
  getBalance(employeeId: string, leaveTypeId: string, fiscalYear: number): Promise<LeaveBalance | null>;
  getAllBalances(employeeId: string, fiscalYear: number): Promise<LeaveBalance[]>;
  initializeBalance(employeeId: string, leaveTypeId: string, fiscalYear: number): Promise<LeaveBalance>;
  deductDays(employeeId: string, leaveTypeId: string, fiscalYear: number, days: number): Promise<LeaveBalance>;
  restoreDays(employeeId: string, leaveTypeId: string, fiscalYear: number, days: number): Promise<LeaveBalance>;
}
