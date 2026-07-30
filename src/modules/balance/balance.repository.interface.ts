import { LeaveBalance } from './balance.model';

export interface ILeaveBalanceRepository {
  findByEmployeeAndPolicy(employeeId: string, leavePolicyId: string): Promise<LeaveBalance | null>;
  findByEmployee(employeeId: string): Promise<LeaveBalance[]>;
  create(balance: Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeaveBalance>;
  update(id: string, data: Partial<LeaveBalance>): Promise<LeaveBalance | null>;
  deductDays(id: string, days: number): Promise<LeaveBalance | null>;
}
