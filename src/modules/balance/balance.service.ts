import { LeaveBalanceRepository } from './balance.repository';
import { LeaveBalance } from './balance.model';
import { BalanceAdjustmentDto } from './balance.dto';

export interface LeaveBalanceService {
  getBalance(employeeId: string, policyId: string, fiscalYear: number): Promise<LeaveBalance>;
  calculateAvailableDays(employeeId: string, policyId: string, startDate: Date, endDate: Date): Promise<number>;
  adjustBalance(dto: BalanceAdjustmentDto): Promise<LeaveBalance>;
}

export class LeaveBalanceServiceImpl implements LeaveBalanceService {
  constructor(
    private readonly leaveBalanceRepository: LeaveBalanceRepository
  ) {}

  async getBalance(employeeId: string, policyId: string, fiscalYear: number): Promise<LeaveBalance> {
    // Implementation will be added in Phase 3
    throw new Error('Not implemented');
  }

  async calculateAvailableDays(employeeId: string, policyId: string, startDate: Date, endDate: Date): Promise<number> {
    // Implementation will be added in Phase 3
    throw new Error('Not implemented');
  }

  async adjustBalance(dto: BalanceAdjustmentDto): Promise<LeaveBalance> {
    // Implementation will be added in Phase 3
    throw new Error('Not implemented');
  }
}
