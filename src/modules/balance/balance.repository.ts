import { LeaveBalance, LeaveBalanceQueryParams } from './balance.model';

export interface ILeaveBalanceRepository {
  findById(id: string): Promise<LeaveBalance | null>;
  findByEmployeeId(employeeId: string): Promise<LeaveBalance[]>;
  findByEmployeeAndPolicy(employeeId: string, policyId: string, fiscalYear: number): Promise<LeaveBalance | null>;
  findByQuery(params: LeaveBalanceQueryParams): Promise<LeaveBalance[]>;
  updateBalance(id: string, usedDays: number, remainingDays: number): Promise<LeaveBalance>;
  create(balance: Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeaveBalance>;
}
