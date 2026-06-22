import { ILeaveBalanceRepository } from './balance.repository';
import { LeaveBalance, CreateLeaveBalanceDto } from './balance.model';
import { EmployeeService } from '../employee/employee.service';
import { PolicyService } from '../policy/policy.service';
import { IAuditRepository } from '../audit/audit.repository';
import { AppError } from '../../shared/types';

export interface IBalanceService {
  initializeBalance(dto: CreateLeaveBalanceDto): Promise<LeaveBalance>;
  getBalance(employeeId: string, leaveTypeId: string, year: number): Promise<LeaveBalance | null>;
  getBalancesForEmployee(employeeId: string, year: number): Promise<LeaveBalance[]>;
  updateBalance(id: string, usedDays: number): Promise<LeaveBalance>;
}

export class BalanceService implements IBalanceService {
  constructor(
    private readonly balanceRepo: ILeaveBalanceRepository,
    private readonly employeeService: EmployeeService,
    private readonly policyService: PolicyService,
    private readonly auditRepo: IAuditRepository
  ) {}

  async initializeBalance(dto: CreateLeaveBalanceDto): Promise<LeaveBalance> {
    await this.employeeService.getEmployeeById(dto.employeeId);
    await this.policyService.getPolicyByLeaveTypeId(dto.leaveTypeId);
    
    const balance = await this.balanceRepo.create(dto);
    
    await this.auditRepo.createAuditLog({
      entityType: 'LeaveBalance',
      entityId: balance.id,
      action: 'CREATE',
      newValue: balance as unknown as Record<string, unknown>,
    });
    
    return balance;
  }

  async getBalance(employeeId: string, leaveTypeId: string, year: number): Promise<LeaveBalance | null> {
    return this.balanceRepo.findByEmployeeLeaveTypeAndYear(employeeId, leaveTypeId, year);
  }

  async getBalancesForEmployee(employeeId: string, year: number): Promise<LeaveBalance[]> {
    return this.balanceRepo.findByEmployeeAndYear(employeeId, year);
  }

  async updateBalance(id: string, usedDays: number): Promise<LeaveBalance> {
    const currentBalance = await this.balanceRepo.findById(id);
    if (!currentBalance) {
      throw new AppError('Balance not found', 404);
    }

    const policy = await this.policyService.getPolicyByLeaveTypeId(currentBalance.leaveTypeId);
    
    if (usedDays > currentBalance.totalDays && !policy.allowNegativeBalance) {
      throw new AppError('Policy constraint violation: Cannot exceed total days without negative balance allowance', 400);
    }

    const updatedBalance = await this.balanceRepo.updateUsedDays(id, usedDays);
    
    await this.auditRepo.createAuditLog({
      entityType: 'LeaveBalance',
      entityId: id,
      action: 'UPDATE',
      oldValue: currentBalance as unknown as Record<string, unknown>,
      newValue: updatedBalance as unknown as Record<string, unknown>,
    });
    
    return updatedBalance;
  }
}
