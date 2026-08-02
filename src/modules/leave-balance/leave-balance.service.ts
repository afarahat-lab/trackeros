import { LeaveBalance } from './leave-balance.model';
import { ILeaveBalanceRepository } from './leave-balance.repository';
import { ILeaveBalanceService } from './leave-balance.service.interface';
import { ILeavePolicyService } from '../leave-policy';

export class NoActivePolicyError extends Error {
  constructor(leaveTypeId: string) {
    super(`No active policy found for leave type: ${leaveTypeId}`);
    this.name = 'NoActivePolicyError';
  }
}

export class BalanceNotFoundError extends Error {
  constructor(employeeId: string, leaveTypeId: string, fiscalYear: number) {
    super(
      `No balance found for employee ${employeeId}, leave type ${leaveTypeId}, fiscal year ${fiscalYear}`,
    );
    this.name = 'BalanceNotFoundError';
  }
}

export class InsufficientBalanceError extends Error {
  constructor(
    employeeId: string,
    leaveTypeId: string,
    fiscalYear: number,
    requested: number,
    remaining: number,
  ) {
    super(
      `Insufficient balance: requested ${requested} days but only ${remaining} remaining for employee ${employeeId}, leave type ${leaveTypeId}, fiscal year ${fiscalYear}`,
    );
    this.name = 'InsufficientBalanceError';
  }
}

export class LeaveBalanceService implements ILeaveBalanceService {
  constructor(
    private readonly repository: ILeaveBalanceRepository,
    private readonly policyService: ILeavePolicyService,
  ) {}

  async getBalance(
    employeeId: string,
    leaveTypeId: string,
    fiscalYear: number,
  ): Promise<LeaveBalance | null> {
    return this.repository.findByEmployeeAndType(employeeId, leaveTypeId, fiscalYear);
  }

  async getAllBalances(employeeId: string, fiscalYear: number): Promise<LeaveBalance[]> {
    return this.repository.findByEmployee(employeeId, fiscalYear);
  }

  async initializeBalance(
    employeeId: string,
    leaveTypeId: string,
    fiscalYear: number,
  ): Promise<LeaveBalance> {
    const policy = await this.policyService.getActivePolicy(leaveTypeId);
    if (!policy) {
      throw new NoActivePolicyError(leaveTypeId);
    }

    return this.repository.create({
      employeeId,
      leaveTypeId,
      policyId: policy.id,
      totalEntitlement: policy.entitlementDays,
      usedDays: 0,
      pendingDays: 0,
      fiscalYear,
      status: 'ACTIVE',
    });
  }

  async deductDays(
    employeeId: string,
    leaveTypeId: string,
    fiscalYear: number,
    days: number,
  ): Promise<LeaveBalance> {
    const balance = await this.repository.findByEmployeeAndType(employeeId, leaveTypeId, fiscalYear);
    if (!balance) {
      throw new BalanceNotFoundError(employeeId, leaveTypeId, fiscalYear);
    }

    const remaining = balance.totalEntitlement - balance.usedDays;
    if (remaining - days < 0) {
      throw new InsufficientBalanceError(employeeId, leaveTypeId, fiscalYear, days, remaining);
    }

    const updated = await this.repository.incrementUsedDays(balance.id, days);
    if (!updated) {
      throw new BalanceNotFoundError(employeeId, leaveTypeId, fiscalYear);
    }
    return updated;
  }

  async restoreDays(
    employeeId: string,
    leaveTypeId: string,
    fiscalYear: number,
    days: number,
  ): Promise<LeaveBalance> {
    const balance = await this.repository.findByEmployeeAndType(employeeId, leaveTypeId, fiscalYear);
    if (!balance) {
      throw new BalanceNotFoundError(employeeId, leaveTypeId, fiscalYear);
    }

    if (balance.usedDays - days < 0) {
      throw new Error(
        `Cannot restore ${days} days: usedDays would go below zero for employee ${employeeId}, leave type ${leaveTypeId}, fiscal year ${fiscalYear}`,
      );
    }

    const updated = await this.repository.decrementUsedDays(balance.id, days);
    if (!updated) {
      throw new BalanceNotFoundError(employeeId, leaveTypeId, fiscalYear);
    }
    return updated;
  }
}
