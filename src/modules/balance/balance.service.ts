import { LeaveType } from 'shared/types/leave.types';
import { PolicyService, PolicyNotFoundError } from 'modules/policy';
import {
  LeaveBalance,
  IBalanceRepository,
  BalanceNotFoundError,
} from './balance.model';

export class BalanceService {
  constructor(
    private readonly balanceRepo: IBalanceRepository,
    private readonly policyService: PolicyService,
  ) {}

  async getOrCreateBalance(
    employeeId: string,
    leaveType: LeaveType,
    startDate: Date,
  ): Promise<LeaveBalance> {
    const fiscalYear = startDate.getFullYear();

    const policy = await this.policyService.getByLeaveType(leaveType);
    const existing = await this.balanceRepo.findByEmployeeYearAndPolicy(
      employeeId,
      fiscalYear,
      policy.id,
    );
    if (existing) {
      return existing;
    }

    const entitlement = await this.policyService.getEntitlementForType(leaveType);
    return this.balanceRepo.create({
      employeeId,
      policyId: policy.id,
      totalEntitlement: entitlement,
      usedDays: 0,
      pendingDays: 0,
      fiscalYear,
      status: 'ACTIVE',
    });
  }

  async getBalancesForEmployee(
    employeeId: string,
    fiscalYear: number,
  ): Promise<LeaveBalance[]> {
    return this.balanceRepo.findByEmployeeAndYear(employeeId, fiscalYear);
  }

  async hasSufficientBalance(
    employeeId: string,
    leaveType: LeaveType,
    startDate: Date,
    requestedDays: number,
  ): Promise<boolean> {
    const fiscalYear = startDate.getFullYear();

    let policy;
    try {
      policy = await this.policyService.getByLeaveType(leaveType);
    } catch (error: unknown) {
      if (error instanceof PolicyNotFoundError) {
        return false;
      }
      throw error;
    }

    const balance = await this.balanceRepo.findByEmployeeYearAndPolicy(
      employeeId,
      fiscalYear,
      policy.id,
    );
    if (!balance) {
      return false;
    }

    return balance.remainingDays >= requestedDays;
  }

  async reserveDays(
    employeeId: string,
    leaveType: LeaveType,
    startDate: Date,
    days: number,
  ): Promise<LeaveBalance> {
    const balance = await this.resolveBalance(employeeId, leaveType, startDate);
    const updated = await this.balanceRepo.deductPendingDays(balance.id, days);
    if (!updated) {
      throw new Error('Insufficient balance for reservation');
    }
    return updated;
  }

  async commitDays(
    employeeId: string,
    leaveType: LeaveType,
    startDate: Date,
    days: number,
  ): Promise<LeaveBalance> {
    const balance = await this.resolveBalance(employeeId, leaveType, startDate);
    const updated = await this.balanceRepo.commitDeduction(balance.id, days);
    if (!updated) {
      throw new Error('Failed to commit deduction');
    }
    return updated;
  }

  async restoreDays(
    employeeId: string,
    leaveType: LeaveType,
    startDate: Date,
    days: number,
  ): Promise<LeaveBalance> {
    const balance = await this.resolveBalance(employeeId, leaveType, startDate);
    const updated = await this.balanceRepo.restorePendingDays(balance.id, days);
    if (!updated) {
      throw new Error('Failed to restore pending days');
    }
    return updated;
  }

  async getBalanceById(id: string): Promise<LeaveBalance | null> {
    return this.balanceRepo.findById(id);
  }

  private async resolveBalance(
    employeeId: string,
    leaveType: LeaveType,
    startDate: Date,
  ): Promise<LeaveBalance> {
    const fiscalYear = startDate.getFullYear();
    const policy = await this.policyService.getByLeaveType(leaveType);

    const balance = await this.balanceRepo.findByEmployeeYearAndPolicy(
      employeeId,
      fiscalYear,
      policy.id,
    );
    if (!balance) {
      throw new BalanceNotFoundError(
        `employee ${employeeId}, policy ${policy.id}, year ${fiscalYear}`,
      );
    }
    return balance;
  }
}
