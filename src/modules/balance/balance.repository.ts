import { LeaveBalance, LeaveBalanceQueryParams } from './balance.model';

export interface ILeaveBalanceRepository {
  findByEmployeeId(employeeId: string, params?: LeaveBalanceQueryParams): Promise<LeaveBalance[]>;
  findByEmployeeAndPolicy(employeeId: string, leavePolicyId: string, fiscalYear: number): Promise<LeaveBalance | null>;
  create(balance: Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeaveBalance>;
  update(id: string, balance: Partial<Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt'>>): Promise<LeaveBalance | null>;
  deductDays(id: string, days: number): Promise<LeaveBalance | null>;
  addPendingDays(id: string, days: number): Promise<LeaveBalance | null>;
}
