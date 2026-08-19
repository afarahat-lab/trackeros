import { LeaveBalance, BalanceStatus } from './balance.model';
import { IBalanceRepository } from './balance.repository';
import { IBalanceService, CreateBalanceDto } from './balance.service.interface';

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

function computeRemainingDays(totalEntitlement: number, usedDays: number): number {
  return Math.floor(totalEntitlement - usedDays);
}

function deriveStatus(remainingDays: number): BalanceStatus {
  return remainingDays > 0 ? BalanceStatus.ACTIVE : BalanceStatus.EXHAUSTED;
}

export class BalanceService implements IBalanceService {
  constructor(private readonly repository: IBalanceRepository) {}

  async getById(id: string): Promise<LeaveBalance | null> {
    return this.repository.findById(id);
  }

  async getByEmployee(employeeId: string): Promise<LeaveBalance[]> {
    return this.repository.findByEmployee(employeeId);
  }

  async getByEmployeeAndPolicy(employeeId: string, leavePolicyId: string): Promise<LeaveBalance | null> {
    return this.repository.findByEmployeeAndPolicy(employeeId, leavePolicyId);
  }

  async create(data: CreateBalanceDto): Promise<LeaveBalance> {
    if (!data.employeeId || data.employeeId.trim().length === 0) {
      throw new ValidationError('employeeId is required and must not be empty');
    }

    if (!data.leavePolicyId || data.leavePolicyId.trim().length === 0) {
      throw new ValidationError('leavePolicyId is required and must not be empty');
    }

    if (typeof data.totalEntitlement !== 'number' || data.totalEntitlement <= 0 || !Number.isFinite(data.totalEntitlement)) {
      throw new ValidationError('totalEntitlement must be a positive number');
    }

    if (typeof data.fiscalYear !== 'number' || data.fiscalYear <= 0 || !Number.isInteger(data.fiscalYear)) {
      throw new ValidationError('fiscalYear must be a positive integer');
    }

    const totalEntitlement = Math.floor(data.totalEntitlement);
    const usedDays = 0;
    const remainingDays = totalEntitlement;

    return this.repository.create({
      employeeId: data.employeeId.trim(),
      leavePolicyId: data.leavePolicyId.trim(),
      totalEntitlement,
      usedDays,
      remainingDays,
      fiscalYear: data.fiscalYear,
      status: BalanceStatus.ACTIVE,
    });
  }

  async deductDays(id: string, days: number): Promise<LeaveBalance> {
    if (typeof days !== 'number' || days <= 0 || !Number.isFinite(days)) {
      throw new ValidationError('days must be a positive number');
    }

    const balance = await this.repository.findById(id);
    if (!balance) {
      throw new ValidationError('Balance not found');
    }

    if (balance.status === BalanceStatus.CLOSED) {
      throw new ValidationError('Cannot deduct from a CLOSED balance');
    }

    if (balance.status !== BalanceStatus.ACTIVE) {
      throw new ValidationError('Cannot deduct from a non-ACTIVE balance');
    }

    const daysToDeduct = Math.floor(days);
    if (balance.remainingDays < daysToDeduct) {
      throw new ValidationError(
        `Insufficient balance: requested ${daysToDeduct} days but only ${balance.remainingDays} remaining`,
      );
    }

    const newUsedDays = balance.usedDays + daysToDeduct;
    const newRemainingDays = computeRemainingDays(balance.totalEntitlement, newUsedDays);
    const newStatus = deriveStatus(newRemainingDays);

    return this.repository.update(id, {
      usedDays: newUsedDays,
      remainingDays: newRemainingDays,
      status: newStatus,
      updatedAt: new Date(),
    }) as Promise<LeaveBalance>;
  }

  async restoreDays(id: string, days: number): Promise<LeaveBalance> {
    if (typeof days !== 'number' || days <= 0 || !Number.isFinite(days)) {
      throw new ValidationError('days must be a positive number');
    }

    const balance = await this.repository.findById(id);
    if (!balance) {
      throw new ValidationError('Balance not found');
    }

    if (balance.status === BalanceStatus.CLOSED) {
      throw new ValidationError('Cannot restore to a CLOSED balance');
    }

    const daysToRestore = Math.floor(days);
    if (balance.usedDays < daysToRestore) {
      throw new ValidationError(
        `Cannot restore ${daysToRestore} days: only ${balance.usedDays} days used`,
      );
    }

    const newUsedDays = balance.usedDays - daysToRestore;
    const newRemainingDays = computeRemainingDays(balance.totalEntitlement, newUsedDays);
    const newStatus = deriveStatus(newRemainingDays);

    return this.repository.update(id, {
      usedDays: newUsedDays,
      remainingDays: newRemainingDays,
      status: newStatus,
      updatedAt: new Date(),
    }) as Promise<LeaveBalance>;
  }

  async hasSufficientBalance(employeeId: string, leavePolicyId: string, requestedDays: number): Promise<boolean> {
    const balance = await this.repository.findByEmployeeAndPolicy(employeeId, leavePolicyId);
    if (!balance) {
      return false;
    }

    if (balance.status !== BalanceStatus.ACTIVE) {
      return false;
    }

    const days = Math.floor(requestedDays);
    return balance.remainingDays >= days;
  }
}
