import { LeaveBalance } from './balance.model';

export interface ILeaveBalanceRepository {
  findByEmployeeId(employeeId: string): Promise<LeaveBalance[]>;
  findByEmployeeIdAndLeaveType(employeeId: string, leaveType: string): Promise<LeaveBalance | null>;
  findByEmployeeIdAndFiscalYear(employeeId: string, fiscalYear: number): Promise<LeaveBalance[]>;
  update(id: string, updates: Partial<LeaveBalance>): Promise<LeaveBalance | null>;
  create(balance: Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeaveBalance>;
}
