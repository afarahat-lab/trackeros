import { LeaveBalance } from './balance.model';

export interface IBalanceRepository {
  findById(id: string): Promise<LeaveBalance | null>;
  findByEmployee(employeeId: string): Promise<LeaveBalance[]>;
  findByEmployeeAndPolicy(employeeId: string, leavePolicyId: string): Promise<LeaveBalance | null>;
  findByEmployeeAndFiscalYear(employeeId: string, fiscalYear: number): Promise<LeaveBalance[]>;
  create(balance: Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeaveBalance>;
  update(id: string, data: Partial<LeaveBalance>): Promise<LeaveBalance | null>;
  delete(id: string): Promise<boolean>;
}
