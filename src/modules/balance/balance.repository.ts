import { LeaveBalance } from './balance.model';

export interface LeaveBalanceRepository {
  findById(id: string): Promise<LeaveBalance | null>;
  findByEmployeeAndPolicy(employeeId: string, policyId: string, fiscalYear: number): Promise<LeaveBalance | null>;
  findByEmployeeId(employeeId: string): Promise<LeaveBalance[]>;
  save(balance: Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeaveBalance>;
  update(id: string, updates: Partial<Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt'>>): Promise<LeaveBalance | null>;
}
