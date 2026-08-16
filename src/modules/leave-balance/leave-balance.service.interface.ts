import { LeaveBalance } from './leave-balance.model';

export interface IBalanceService {
  getBalance(employeeId: string, leavePolicyId: string, fiscalYear: number): Promise<LeaveBalance>;
  getBalancesForEmployee(employeeId: string, fiscalYear: number): Promise<LeaveBalance[]>;
  initializeBalance(employeeId: string, leavePolicyId: string, fiscalYear: number): Promise<LeaveBalance>;
}
