import { LeaveBalance } from './balance.model';

export interface ILeaveBalanceRepository {
  findByEmployeeId(employeeId: string): Promise<LeaveBalance[]>;
  findByEmployeeIdAndFiscalYear(employeeId: string, fiscalYear: number): Promise<LeaveBalance[]>;
  findByEmployeeIdAndPolicyId(employeeId: string, policyId: string): Promise<LeaveBalance | null>;
  findByEmployeeIdPolicyIdAndFiscalYear(employeeId: string, policyId: string, fiscalYear: number): Promise<LeaveBalance | null>;
  updateUsedDays(id: string, usedDays: number): Promise<LeaveBalance>;
  updateRemainingDays(id: string, remainingDays: number): Promise<LeaveBalance>;
  create(balance: Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeaveBalance>;
}
