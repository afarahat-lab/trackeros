
import { LeaveBalance, CreateLeaveBalanceDto } from './balance.model';
import { ILeaveBalanceRepository } from './balance.repository';
import { NotFoundError, ValidationError } from 'shared/error-types';

export interface ILeaveBalanceService {
  getBalance(employeeId: string, leavePolicyId: string, fiscalYear: number): Promise<LeaveBalance>;
  getOrCreateBalance(dto: CreateLeaveBalanceDto): Promise<LeaveBalance>;
  deductDays(
    employeeId: string,
    leavePolicyId: string,
    fiscalYear: number,
    startDate: Date,
    endDate: Date,
  ): Promise<LeaveBalance>;
  restoreDays(
    employeeId: string,
    leavePolicyId: string,
    fiscalYear: number,
    days: number,
  ): Promise<LeaveBalance>;
  getRemainingDays(employeeId: string, leavePolicyId: string, fiscalYear: number): Promise<number>;
  closeBalance(employeeId: string, leavePolicyId: string, fiscalYear: number): Promise<LeaveBalance>;
}

export class LeaveBalanceService implements ILeaveBalanceService {
  constructor(private readonly balanceRepository: ILeaveBalanceRepository) {}

  async getBalance(
    employeeId: string,
    leavePolicyId: string,
    fiscalYear: number,
  ): Promise<LeaveBalance> {
    const balance = await this.balanceRepository.findByEmployeeAndPolicy(
      employeeId,
      leavePolicyId,
    );
    if (!balance || balance.fiscalYear !== fiscalYear) {
      throw new NotFoundError(
        `LeaveBalance for employee ${employeeId}, policy ${leavePolicyId}, fiscal year ${fiscalYear} not found`,
      );
    }
    return balance;
  }

  async getOrCreateBalance(dto: CreateLeaveBalanceDto): Promise<LeaveBalance> {
    const existing = await this.balanceRepository.findByEmployeeAndPolicy(
      dto.employeeId,
      dto.leavePolicyId,
    );

    if (existing && existing.fiscalYear === dto.fiscalYear) {
      return existing;
    }

    const balance = await this.balanceRepository.upsert({
      employeeId: dto.employeeId,
      leavePolicyId: dto.leavePolicyId,
      totalEntitlement: dto.totalEntitlement,
      usedDays: 0,
      remainingDays: dto.totalEntitlement,
      fiscalYear: dto.fiscalYear,
      status: 'ACTIVE',
    });

    return balance;
  }

  async deductDays(
    employeeId: string,
    leavePolicyId: string,
    fiscalYear: number,
    startDate: Date,
    endDate: Date,
  ): Promise<LeaveBalance> {
    const balance = await this.getBalance(employeeId, leavePolicyId, fiscalYear);

    if (balance.status === 'CLOSED') {
      throw new ValidationError(
        `LeaveBalance for fiscal year ${fiscalYear} is closed`,
      );
    }

    const startMs = startDate.getTime();
    const endMs = endDate.getTime();
    const diffMs = endMs - startMs;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const daysRequested = diffDays + 1;

    if (daysRequested <= 0) {
      throw new ValidationError('Days requested must be positive');
    }

    if (balance.remainingDays < daysRequested) {
      throw new ValidationError(
        `Insufficient balance: requested ${daysRequested} days but only ${balance.remainingDays} remaining`,
      );
    }

    const newUsedDays = balance.usedDays + daysRequested;
    const newRemainingDays = balance.totalEntitlement - newUsedDays;

    const updated = await this.balanceRepository.update(balance.id, {
      usedDays: newUsedDays,
      remainingDays: newRemainingDays,
    });

    if (!updated) {
      throw new NotFoundError(
        `LeaveBalance for employee ${employeeId}, policy ${leavePolicyId}, fiscal year ${fiscalYear} not found`,
      );
    }

    return updated;
  }

  async restoreDays(
    employeeId: string,
    leavePolicyId: string,
    fiscalYear: number,
    days: number,
  ): Promise<LeaveBalance> {
    const balance = await this.getBalance(employeeId, leavePolicyId, fiscalYear);

    if (days <= 0) {
      throw new ValidationError('Days to restore must be positive');
    }

    const newUsedDays = Math.max(0, balance.usedDays - days);
    const newRemainingDays = balance.totalEntitlement - newUsedDays;

    const updated = await this.balanceRepository.update(balance.id, {
      usedDays: newUsedDays,
      remainingDays: newRemainingDays,
    });

    if (!updated) {
      throw new NotFoundError(
        `LeaveBalance for employee ${employeeId}, policy ${leavePolicyId}, fiscal year ${fiscalYear} not found`,
      );
    }

    return updated;
  }

  async getRemainingDays(
    employeeId: string,
    leavePolicyId: string,
    fiscalYear: number,
  ): Promise<number> {
    const balance = await this.getBalance(employeeId, leavePolicyId, fiscalYear);
    return balance.remainingDays;
  }

  async closeBalance(
    employeeId: string,
    leavePolicyId: string,
    fiscalYear: number,
  ): Promise<LeaveBalance> {
    const balance = await this.getBalance(employeeId, leavePolicyId, fiscalYear);

    if (balance.status === 'CLOSED') {
      return balance;
    }

    const updated = await this.balanceRepository.update(balance.id, {
      status: 'CLOSED',
    });

    if (!updated) {
      throw new NotFoundError(
        `LeaveBalance for employee ${employeeId}, policy ${leavePolicyId}, fiscal year ${fiscalYear} not found`,
      );
    }

    return updated;
  }
}
