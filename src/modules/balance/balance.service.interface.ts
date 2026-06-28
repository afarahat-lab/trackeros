import { LeaveBalance } from './balance.model';
import { LeaveType } from '../../shared/types/leave.types';

export interface IBalanceService {
  getBalance(employeeId: string, leaveType: LeaveType, fiscalYear: number): Promise<LeaveBalance | null>;
  getBalancesForEmployee(employeeId: string): Promise<LeaveBalance[]>;
  initializeBalance(employeeId: string, leaveType: LeaveType, fiscalYear: number, entitlementDays: number): Promise<LeaveBalance>;
  deductBalance(employeeId: string, leaveType: LeaveType, fiscalYear: number, days: number): Promise<LeaveBalance>;
  restoreBalance(employeeId: string, leaveType: LeaveType, fiscalYear: number, days: number): Promise<LeaveBalance>;
}
