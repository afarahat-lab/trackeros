import { LeaveBalance } from './balance.model';

export interface ILeaveBalanceRepository {
  findByEmployee(employeeId: string, fiscalYear?: number): Promise<LeaveBalance[]>;
  findById(id: string): Promise<LeaveBalance | null>;
  update(id: string, data: Partial<LeaveBalance>): Promise<LeaveBalance>;
  deduct(employeeId: string, policyId: string, fiscalYear: number, days: number): Promise<LeaveBalance>;
  add(employeeId: string, policyId: string, fiscalYear: number, days: number): Promise<LeaveBalance>;
}
