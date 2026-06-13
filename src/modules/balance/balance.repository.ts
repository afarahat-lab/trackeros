import { LeaveBalance } from './balance.model';

export interface ILeaveBalanceRepository {
  findByEmployeeIdAndLeaveType(employeeId: string, leaveType: string, fiscalYear: number): Promise<LeaveBalance | null>;
  findByEmployeeId(employeeId: string, fiscalYear?: number): Promise<LeaveBalance[]>;
  create(balance: Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeaveBalance>;
  update(id: string, updates: Partial<LeaveBalance>): Promise<LeaveBalance | null>;
  updateRemainingDays(id: string, usedDaysDelta: number): Promise<LeaveBalance | null>;
}
