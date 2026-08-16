import { IBalanceService } from './balance.service.interface';
import { IBalanceRepository } from './balance.repository';
import { IPolicyRepository } from '../policy';
import { IEmployeeRepository } from '../employee';
import { LeaveBalance } from './balance.model';

export class BalanceService implements IBalanceService {
  constructor(
    private readonly balanceRepository: IBalanceRepository,
    private readonly policyRepository: IPolicyRepository,
    private readonly employeeRepository: IEmployeeRepository,
  ) {}

  async getBalance(employeeId: string, policyId: string): Promise<LeaveBalance | null> {
    return this.balanceRepository.findByEmployeeAndPolicy(employeeId, policyId);
  }

  async getAvailableDays(employeeId: string, policyId: string): Promise<number> {
    const balance = await this.balanceRepository.findByEmployeeAndPolicy(employeeId, policyId);
    if (!balance) {
      return 0;
    }
    return balance.remainingDays;
  }

  async reserveDays(employeeId: string, policyId: string, days: number): Promise<void> {
    if (days <= 0) {
      throw new Error('Days to reserve must be positive');
    }

    const balance = await this.balanceRepository.findByEmployeeAndPolicy(employeeId, policyId);
    if (!balance) {
      throw new Error('No balance found for the given employee and policy');
    }

    if (balance.remainingDays < days) {
      throw new Error('Insufficient available balance');
    }

    const newRemainingDays = balance.remainingDays - days;
    await this.balanceRepository.update(balance.id, { remainingDays: newRemainingDays });
  }

  async releaseReservation(employeeId: string, policyId: string, days: number): Promise<void> {
    if (days <= 0) {
      throw new Error('Days to release must be positive');
    }

    const balance = await this.balanceRepository.findByEmployeeAndPolicy(employeeId, policyId);
    if (!balance) {
      throw new Error('No balance found for the given employee and policy');
    }

    const newRemainingDays = balance.remainingDays + days;
    await this.balanceRepository.update(balance.id, { remainingDays: newRemainingDays });
  }

  async deductDays(employeeId: string, policyId: string, days: number): Promise<void> {
    if (days <= 0) {
      throw new Error('Days to deduct must be positive');
    }

    const balance = await this.balanceRepository.findByEmployeeAndPolicy(employeeId, policyId);
    if (!balance) {
      throw new Error('No balance found for the given employee and policy');
    }

    const newUsedDays = balance.usedDays + days;
    await this.balanceRepository.updateUsedDays(balance.id, newUsedDays, balance.remainingDays);
  }

  async initializeBalancesForEmployee(employeeId: string): Promise<void> {
    const employee = await this.employeeRepository.findById(employeeId);
    if (!employee) {
      throw new Error('Employee not found');
    }

    const policies = await this.policyRepository.findAllActive();
    const currentYear = new Date().getFullYear();

    for (const policy of policies) {
      const existingBalance = await this.balanceRepository.findByEmployeeAndPolicy(
        employeeId,
        policy.id,
      );
      if (existingBalance) {
        continue;
      }

      const entitlement = this.computeProRatedEntitlement(
        policy.entitlementDays,
        employee.hireDate,
        currentYear,
      );

      await this.balanceRepository.create({
        employeeId,
        policyId: policy.id,
        totalEntitlement: entitlement,
        usedDays: 0,
        remainingDays: entitlement,
        fiscalYear: currentYear,
        status: entitlement > 0 ? 'ACTIVE' : 'EXHAUSTED',
      });
    }
  }

  private computeProRatedEntitlement(
    annualEntitlement: number,
    hireDate: Date,
    fiscalYear: number,
  ): number {
    const hireYear = hireDate.getFullYear();

    if (hireYear < fiscalYear) {
      return annualEntitlement;
    }

    if (hireYear > fiscalYear) {
      return 0;
    }

    const hireMonth = hireDate.getMonth();
    const hireDay = hireDate.getDate();

    let remainingMonths: number;
    if (hireDay === 1) {
      remainingMonths = 12 - hireMonth;
    } else {
      remainingMonths = 12 - hireMonth - 1;
    }

    if (remainingMonths <= 0) {
      return 0;
    }

    return Math.floor((annualEntitlement * remainingMonths) / 12);
  }
}
