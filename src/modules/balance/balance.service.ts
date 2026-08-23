import { LeaveType } from 'shared/types/leave.types';
import { PolicyService } from 'modules/policy';
import {
  LeaveBalance,
  IBalanceRepository,
  BalanceNotFoundError,
  InsufficientBalanceError,
} from './balance.model';

export class BalanceService {
  constructor(
    private readonly balanceRepo: IBalanceRepository,
    private readonly policyService: PolicyService
  ) {}

  async getById(id: string): Promise<LeaveBalance> {
    const balance = await this.balanceRepo.findById(id);
    if (!balance) {
      throw new BalanceNotFoundError(id);
    }
    return balance;
  }

  async getOrCreateBalance(
    employeeId: string,
    leaveType: LeaveType,
    fiscalYear: number
  ): Promise<LeaveBalance> {
    const policy = await this.policyService.getByLeaveType(leaveType);

    const existing = await this.balanceRepo.findByEmployeeYearAndPolicy(
      employeeId,
      fiscalYear,
      policy.id
    );

    if (existing) {
      return existing;
    }

    return this.balanceRepo.create({
      employeeId,
      policyId: policy.id,
      totalEntitlement: policy.entitlementDays,
      usedDays: 0,
      pendingDays: 0,
      fiscalYear,
      status: 'ACTIVE',
    });
  }

  async getBalancesForEmployee(
    employeeId: string,
    fiscalYear: number
  ): Promise<LeaveBalance[]> {
    return this.balanceRepo.findByEmployeeAndYear(employeeId, fiscalYear);
  }

  async hasSufficientBalance(
    employeeId: string,
    leaveType: LeaveType,
    fiscalYear: number,
    requestedDays: number
  ): Promise<boolean> {
    const balance = await this.getOrCreateBalance(
      employeeId,
      leaveType,
      fiscalYear
    );
    return balance.remainingDays >= requestedDays;
  }

  async reserveDays(
    employeeId: string,
    leaveType: LeaveType,
    fiscalYear: number,
    days: number
  ): Promise<LeaveBalance> {
    const balance = await this.getOrCreateBalance(
      employeeId,
      leaveType,
      fiscalYear
    );

    const updated = await this.balanceRepo.deductPendingDays(
      balance.id,
      days
    );

    if (!updated) {
      throw new BalanceNotFoundError(balance.id);
    }

    return updated;
  }

  async commitDays(
    employeeId: string,
    leaveType: LeaveType,
    fiscalYear: number,
    days: number
  ): Promise<LeaveBalance> {
    const balance = await this.getOrCreateBalance(
      employeeId,
      leaveType,
      fiscalYear
    );

    const updated = await this.balanceRepo.commitDeduction(balance.id, days);

    if (!updated) {
      throw new BalanceNotFoundError(balance.id);
    }

    return updated;
  }

  async restoreDays(
    employeeId: string,
    leaveType: LeaveType,
    fiscalYear: number,
    days: number
  ): Promise<LeaveBalance> {
    const balance = await this.getOrCreateBalance(
      employeeId,
      leaveType,
      fiscalYear
    );

    const updated = await this.balanceRepo.restorePendingDays(
      balance.id,
      days
    );

    if (!updated) {
      throw new BalanceNotFoundError(balance.id);
    }

    return updated;
  }
}
