import { LeaveBalance } from './leave.model';

export interface ILeaveBalanceRepository {
  findByEmployeeAndPolicy(employeeId: string, policyId: string, fiscalYear: number): Promise<LeaveBalance | null>;
}

export class LeaveBalanceRepository implements ILeaveBalanceRepository {
  constructor(private readonly db: any) {}

  async findByEmployeeAndPolicy(employeeId: string, policyId: string, fiscalYear: number): Promise<LeaveBalance | null> {
    // Implementation will be added in phase 2
    throw new Error('Not implemented');
  }
}
