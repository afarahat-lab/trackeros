import { ILeaveBalanceRepository } from './balance.repository';
import { IAuditLogRepository } from '../../shared/audit/audit.repository';
import { LeaveBalance } from './balance.model';

export class BalanceService {
  constructor(
    private readonly balanceRepo: ILeaveBalanceRepository,
    private readonly auditRepo: IAuditLogRepository,
  ) {}

  async getBalances(employeeId: string): Promise<LeaveBalance[]> {
    return this.balanceRepo.findByEmployeeId(employeeId);
  }

  async getBalance(employeeId: string, leaveType: string): Promise<LeaveBalance | null> {
    return this.balanceRepo.findByEmployeeIdAndType(employeeId, leaveType);
  }
}
