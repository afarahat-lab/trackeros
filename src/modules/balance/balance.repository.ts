import { LeaveBalance, LeaveBalanceQuery } from './balance.model';

export interface ILeaveBalanceRepository {
  findByEmployeeId(employeeId: string): Promise<LeaveBalance[]>;
  findByEmployeeAndPolicy(employeeId: string, policyId: string): Promise<LeaveBalance | null>;
  updateBalance(id: string, balanceDays: number): Promise<LeaveBalance>;
  findByQuery(query: LeaveBalanceQuery): Promise<LeaveBalance[]>;
  create(balance: Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeaveBalance>;
  delete(id: string): Promise<void>;
}
