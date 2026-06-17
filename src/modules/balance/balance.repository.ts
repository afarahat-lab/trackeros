import { LeaveBalance } from './balance.model';

export interface ILeaveBalanceRepository {
  findByEmployeeId(employeeId: string): Promise<LeaveBalance[]>;
  findByEmployeeIdAndType(employeeId: string, leaveType: string): Promise<LeaveBalance | null>;
  create(balance: Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeaveBalance>;
  update(id: string, balance: Partial<Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt'>>): Promise<LeaveBalance | null>;
}
