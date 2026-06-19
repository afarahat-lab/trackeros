import { LeaveBalance } from './balance.model';
import { ILeaveBalanceRepository } from './balance.repository';
import { ILeaveAuditRepository } from '../audit/audit.repository';
import { IEmployeeRepository } from '../employee/employee.repository';

export interface LeaveBalanceService {
  getBalance(employeeId: string, policyId: string, fiscalYear: number): Promise<LeaveBalance | null>;
  updateBalance(employeeId: string, policyId: string, fiscalYear: number, usedDaysDelta: number): Promise<LeaveBalance>;
  createBalance(employeeId: string, policyId: string, fiscalYear: number, totalEntitlement: number): Promise<LeaveBalance>;
  getBalancesByEmployee(employeeId: string, fiscalYear?: number): Promise<LeaveBalance[]>;
  recalculateBalance(employeeId: string, policyId: string, fiscalYear: number): Promise<LeaveBalance>;
}

export class BalanceService implements LeaveBalanceService {
  constructor(
    private readonly balanceRepository: ILeaveBalanceRepository,
    private readonly auditRepository: ILeaveAuditRepository,
    private readonly employeeRepository: IEmployeeRepository
  ) {}

  async getBalance(employeeId: string, policyId: string, fiscalYear: number): Promise<LeaveBalance | null> {
    if (!employeeId || !policyId || !fiscalYear) {
      throw new Error('Missing required parameters');
    }
    return this.balanceRepository.findByEmployeeAndPolicy(employeeId, policyId, fiscalYear);
  }

  async updateBalance(employeeId: string, policyId: string, fiscalYear: number, usedDaysDelta: number): Promise<LeaveBalance> {
    if (!employeeId || !policyId || !fiscalYear || usedDaysDelta === undefined) {
      throw new Error('Missing required parameters');
    }

    const balance = await this.balanceRepository.findByEmployeeAndPolicy(employeeId, policyId, fiscalYear);
    if (!balance) {
      throw new Error('Balance not found');
    }

    const newUsedDays = balance.usedDays + usedDaysDelta;
    const newRemainingDays = balance.totalEntitlement - newUsedDays;

    const updatedBalance = await this.balanceRepository.updateBalance(balance.id, newUsedDays, newRemainingDays);

    await this.auditRepository.createLeaveBalanceAudit({
      employeeId,
      policyId,
      fiscalYear,
      previousBalance: balance.remainingDays,
      newBalance: updatedBalance.remainingDays,
      action: 'BALANCE_UPDATED',
      actorId: employeeId
    });

    return updatedBalance;
  }

  async createBalance(employeeId: string, policyId: string, fiscalYear: number, totalEntitlement: number): Promise<LeaveBalance> {
    if (!employeeId || !policyId || !fiscalYear || totalEntitlement === undefined) {
      throw new Error('Missing required parameters');
    }
    if (totalEntitlement < 0) {
      throw new Error('Total entitlement cannot be negative');
    }

    return this.balanceRepository.create({
      employeeId,
      policyId,
      fiscalYear,
      totalEntitlement,
      usedDays: 0,
      remainingDays: totalEntitlement,
      status: 'ACTIVE'
    });
  }

  async getBalancesByEmployee(employeeId: string, fiscalYear?: number): Promise<LeaveBalance[]> {
    if (!employeeId) {
      throw new Error('Employee ID is required');
    }

    if (fiscalYear) {
      return this.balanceRepository.findByQuery({ employeeId, fiscalYear });
    }
    return this.balanceRepository.findByEmployeeId(employeeId);
  }

  async recalculateBalance(employeeId: string, policyId: string, fiscalYear: number): Promise<LeaveBalance> {
    if (!employeeId || !policyId || !fiscalYear) {
      throw new Error('Missing required parameters');
    }

    const balance = await this.balanceRepository.findByEmployeeAndPolicy(employeeId, policyId, fiscalYear);
    if (!balance) {
      throw new Error('Balance not found');
    }

    const remainingDays = balance.totalEntitlement - balance.usedDays;
    return this.balanceRepository.updateBalance(balance.id, balance.usedDays, remainingDays);
  }
}
