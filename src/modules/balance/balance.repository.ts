import { LeaveBalance } from './balance.model';

export interface ILeaveBalanceRepository {
  findByEmployeeId(employeeId: string): Promise<LeaveBalance[]>;
  findByEmployeeIdAndLeaveType(employeeId: string, leaveType: string): Promise<LeaveBalance | null>;
  findByEmployeeIdAndFiscalYear(employeeId: string, fiscalYear: number): Promise<LeaveBalance[]>;
  updateBalance(id: string, usedDays: number, remainingDays: number): Promise<LeaveBalance>;
  create(balance: Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeaveBalance>;
}
