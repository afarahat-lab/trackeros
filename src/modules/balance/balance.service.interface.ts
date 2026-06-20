import { LeaveBalance } from '../../shared/types/index';

export interface IBalanceService {
  getBalance(employeeId: string, leaveTypeId: string, year: number): Promise<LeaveBalance | null>;
  getBalancesForEmployee(employeeId: string, year?: number): Promise<LeaveBalance[]>;
  updateBalance(employeeId: string, leaveTypeId: string, year: number, daysUsed: number): Promise<LeaveBalance>;
}
