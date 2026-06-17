import { ILeaveBalanceRepository } from './balance.repository';
import { IAuditLogRepository } from '../../shared/audit/audit.repository';
import { LeaveBalance } from './balance.model';

export interface ILeaveBalanceService {
  getBalance(employeeId: string, leaveType: string, year: number): Promise<LeaveBalance | null>;
  getBalancesByEmployee(employeeId: string, year: number): Promise<LeaveBalance[]>;
  adjustBalance(employeeId: string, leaveType: string, year: number, adjustmentDays: number): Promise<LeaveBalance>;
  calculateAvailableDays(employeeId: string, leaveType: string, year: number): Promise<number>;
}

export class LeaveBalanceService implements ILeaveBalanceService {
  constructor(
    private readonly leaveBalanceRepository: ILeaveBalanceRepository,
    private readonly auditLogRepository: IAuditLogRepository,
  ) {}

  async getBalance(employeeId: string, leaveType: string, year: number): Promise<LeaveBalance | null> {
    // Implementation will be added in Phase 3
    throw new Error('Not implemented');
  }

  async getBalancesByEmployee(employeeId: string, year: number): Promise<LeaveBalance[]> {
    // Implementation will be added in Phase 3
    throw new Error('Not implemented');
  }

  async adjustBalance(employeeId: string, leaveType: string, year: number, adjustmentDays: number): Promise<LeaveBalance> {
    // Implementation will be added in Phase 3
    throw new Error('Not implemented');
  }

  async calculateAvailableDays(employeeId: string, leaveType: string, year: number): Promise<number> {
    // Implementation will be added in Phase 3
    throw new Error('Not implemented');
  }
}
