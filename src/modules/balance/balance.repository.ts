import { LeaveBalance } from './balance.model';

export interface BalanceRepository {
  findByEmployeeAndYear(employeeId: string, year: number): Promise<LeaveBalance[]>;
  findByEmployeePolicyAndYear(employeeId: string, policyId: string, year: number): Promise<LeaveBalance | null>;
  save(balance: Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeaveBalance>;
  update(id: string, updates: Partial<Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt'>>): Promise<LeaveBalance | null>;
}
