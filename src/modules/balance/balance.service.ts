import { LeaveBalance } from './balance.model';
import { ILeaveBalanceRepository } from './balance.repository';
import { IAuditLogRepository } from '../../shared/audit/audit.repository';

export interface ILeaveBalanceService {
  getBalance(employeeId: string, policyId: string, fiscalYear: number): Promise<LeaveBalance | null>;
  getBalancesByEmployee(employeeId: string, fiscalYear: number): Promise<LeaveBalance[]>;
  adjustBalance(employeeId: string, policyId: string, fiscalYear: number, adjustmentDays: number): Promise<LeaveBalance>;
  calculateAvailableDays(employeeId: string, policyId: string, fiscalYear: number): Promise<number>;
}

export class LeaveBalanceService implements ILeaveBalanceService {
  constructor(
    private readonly leaveBalanceRepository: ILeaveBalanceRepository,
    private readonly auditLogRepository: IAuditLogRepository
  ) {}

  async getBalance(employeeId: string, policyId: string, fiscalYear: number): Promise<LeaveBalance | null> {
    // Implementation will be added in Phase 3
    throw new Error('Not implemented');
  }

  async getBalancesByEmployee(employeeId: string, fiscalYear: number): Promise<LeaveBalance[]> {
    // Implementation will be added in Phase 3
    throw new Error('Not implemented');
  }

  async adjustBalance(employeeId: string, policyId: string, fiscalYear: number, adjustmentDays: number): Promise<LeaveBalance> {
    // Implementation will be added in Phase 3
    throw new Error('Not implemented');
  }

  async calculateAvailableDays(employeeId: string, policyId: string, fiscalYear: number): Promise<number> {
    // Implementation will be added in Phase 3
    throw new Error('Not implemented');
  }
}
