import { ILeaveBalanceRepository } from './balance.repository';
import { LeaveBalance } from './balance.model';

export class LeaveBalanceRepository implements ILeaveBalanceRepository {
  async findByEmployee(employeeId: string, fiscalYear?: number): Promise<LeaveBalance[]> {
    throw new Error('Not implemented');
  }
  async findById(id: string): Promise<LeaveBalance | null> {
    throw new Error('Not implemented');
  }
  async update(id: string, data: Partial<LeaveBalance>): Promise<LeaveBalance> {
    throw new Error('Not implemented');
  }
  async deduct(employeeId: string, policyId: string, fiscalYear: number, days: number): Promise<LeaveBalance> {
    throw new Error('Not implemented');
  }
  async add(employeeId: string, policyId: string, fiscalYear: number, days: number): Promise<LeaveBalance> {
    throw new Error('Not implemented');
  }
}
