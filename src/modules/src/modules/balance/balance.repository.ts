import { LeaveBalance } from './balance.model';

export interface ILeaveBalanceRepository {
  findByEmployeeId(employeeId: string): Promise<LeaveBalance[]>;
  findByEmployeeAndPolicy(employeeId: string, policyId: string, fiscalYear: number): Promise<LeaveBalance | null>;
  updateBalance(id: string, balanceDays: number): Promise<LeaveBalance>;
  create(balance: Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeaveBalance>;
}
