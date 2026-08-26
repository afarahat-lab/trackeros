import type { PoolClient } from 'pg';
import { LeaveBalance } from './balance.model';
import { IBalanceRepository } from './balance.repository.interface';
import { IBalanceService } from './balance.service.interface';

export class BalanceService implements IBalanceService {
  constructor(private readonly repository: IBalanceRepository) {}

  async getAvailableDays(employeeId: string, policyId: string, year: number): Promise<number> {
    const balance = await this.repository.findByEmployeePolicyAndYear(employeeId, policyId, year);
    if (!balance) {
      return 0;
    }
    return balance.entitlementDays - balance.usedDays - balance.pendingDays;
  }

  async hasSufficientBalance(employeeId: string, policyId: string, year: number, requestedDays: number): Promise<boolean> {
    const availableDays = await this.getAvailableDays(employeeId, policyId, year);
    return availableDays >= requestedDays;
  }

  async reserveDays(employeeId: string, policyId: string, year: number, days: number, client?: PoolClient): Promise<void> {
    const balance = await this.getBalanceForOperation(employeeId, policyId, year);
    const availableDays = balance.entitlementDays - balance.usedDays - balance.pendingDays;
    if (availableDays < days) {
      throw new Error(`Insufficient available balance: requested ${days}, available ${availableDays}`);
    }
    await this.repository.updateCounters(balance.id, balance.usedDays, balance.pendingDays + days, client);
  }

  async commitDays(employeeId: string, policyId: string, year: number, days: number, client?: PoolClient): Promise<void> {
    const balance = await this.getBalanceForOperation(employeeId, policyId, year);
    if (balance.pendingDays < days) {
      throw new Error(`Insufficient pending days: requested ${days}, pending ${balance.pendingDays}`);
    }
    await this.repository.updateCounters(balance.id, balance.usedDays + days, balance.pendingDays - days, client);
  }

  async releaseDays(employeeId: string, policyId: string, year: number, days: number, client?: PoolClient): Promise<void> {
    const balance = await this.getBalanceForOperation(employeeId, policyId, year);
    if (balance.pendingDays < days) {
      throw new Error(`Insufficient pending days: requested ${days}, pending ${balance.pendingDays}`);
    }
    await this.repository.updateCounters(balance.id, balance.usedDays, balance.pendingDays - days, client);
  }

  async restoreDays(employeeId: string, policyId: string, year: number, days: number, client?: PoolClient): Promise<void> {
    const balance = await this.getBalanceForOperation(employeeId, policyId, year);
    if (balance.usedDays < days) {
      throw new Error(`Insufficient used days: requested ${days}, used ${balance.usedDays}`);
    }
    await this.repository.updateCounters(balance.id, balance.usedDays - days, balance.pendingDays, client);
  }

  async getOrCreateBalance(employeeId: string, policyId: string, year: number, entitlementDays: number): Promise<LeaveBalance> {
    return this.repository.getOrCreateForYear(employeeId, policyId, year, entitlementDays);
  }

  private async getBalanceForOperation(employeeId: string, policyId: string, year: number): Promise<LeaveBalance> {
    const balance = await this.repository.findByEmployeePolicyAndYear(employeeId, policyId, year);
    if (!balance) {
      throw new Error(`No balance found for employee ${employeeId}, policy ${policyId}, year ${year}`);
    }
    return balance;
  }
}
