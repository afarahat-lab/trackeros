import { randomUUID } from 'crypto';
import { IBalanceRepository, CreateLeaveBalanceInput } from './balance.repository';
import { LeaveBalance, BalanceStatus } from './balance.model';

export class InsufficientBalanceError extends Error {
  constructor(
    public readonly balanceId: string,
    public readonly requested: number,
    public readonly remaining: number,
  ) {
    super(
      `Insufficient balance: requested ${requested} days but only ${remaining} remaining`,
    );
    this.name = 'InsufficientBalanceError';
  }
}

export interface IBalanceService {
  getBalance(
    employeeId: string,
    policyId: string,
    fiscalYear: number,
  ): Promise<LeaveBalance | null>;
  getBalances(
    employeeId: string,
    fiscalYear: number,
  ): Promise<LeaveBalance[]>;
  initializeBalance(
    employeeId: string,
    policyId: string,
    totalEntitlement: number,
    fiscalYear: number,
  ): Promise<LeaveBalance>;
  deductDays(balanceId: string, days: number): Promise<LeaveBalance>;
  restoreDays(balanceId: string, days: number): Promise<LeaveBalance>;
}

export class BalanceService implements IBalanceService {
  constructor(private readonly repository: IBalanceRepository) {}

  async getBalance(
    employeeId: string,
    policyId: string,
    fiscalYear: number,
  ): Promise<LeaveBalance | null> {
    return this.repository.findByEmployeeAndPolicy(
      employeeId,
      policyId,
      fiscalYear,
    );
  }

  async getBalances(
    employeeId: string,
    fiscalYear: number,
  ): Promise<LeaveBalance[]> {
    return this.repository.findByEmployee(employeeId, fiscalYear);
  }

  async initializeBalance(
    employeeId: string,
    policyId: string,
    totalEntitlement: number,
    fiscalYear: number,
  ): Promise<LeaveBalance> {
    const input: CreateLeaveBalanceInput = {
      id: randomUUID(),
      employeeId,
      policyId,
      totalEntitlement,
      usedDays: 0,
      fiscalYear,
      status: BalanceStatus.ACTIVE,
    };
    return this.repository.create(input);
  }

  async deductDays(balanceId: string, days: number): Promise<LeaveBalance> {
    const balance = await this.repository.incrementUsedDays(balanceId, days);
    if (!balance) {
      throw new Error(`Balance not found: ${balanceId}`);
    }
    if (balance.remainingDays < 0) {
      await this.repository.decrementUsedDays(balanceId, days);
      throw new InsufficientBalanceError(
        balanceId,
        days,
        balance.remainingDays + days,
      );
    }
    return balance;
  }

  async restoreDays(balanceId: string, days: number): Promise<LeaveBalance> {
    const balance = await this.repository.decrementUsedDays(balanceId, days);
    if (!balance) {
      throw new Error(
        `Cannot restore ${days} days for balance ${balanceId}: insufficient used days or balance not found`,
      );
    }
    return balance;
  }
}
