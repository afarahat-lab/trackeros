import { PoolClient } from 'pg';
import { ILeaveBalanceService } from './leave-balance.service.interface';
import { ILeaveBalanceRepository } from './leave-balance.repository';
import { ILeavePolicyRepository } from '../leave-policy/leave-policy.repository';
import { LeaveBalance } from './leave-balance.model';
import { LeavePolicy } from '../leave-policy/leave-policy.model';
import { Employee } from '../employee/employee.model';
import { LeaveType, BalanceStatus } from '../../shared/types/leave.types';

export class LeaveBalanceService implements ILeaveBalanceService {
  constructor(
    private readonly balanceRepository: ILeaveBalanceRepository,
    private readonly policyRepository: ILeavePolicyRepository,
  ) {}

  async getBalance(
    employeeId: string,
    leaveType: LeaveType,
    fiscalYear?: number,
    client?: PoolClient,
  ): Promise<LeaveBalance | null> {
    const policy = await this.findActivePolicy(leaveType, client);
    if (!policy) {
      return null;
    }

    return this.balanceRepository.findByEmployeeAndPolicy(
      employeeId,
      policy.id,
      fiscalYear,
      client,
    );
  }

  async initializeBalancesForEmployee(
    employee: Employee,
    client?: PoolClient,
  ): Promise<LeaveBalance[]> {
    const policies = await this.policyRepository.findAllActive(client);
    const fiscalYear = employee.hireDate.getUTCFullYear();
    const balances: LeaveBalance[] = [];

    for (const policy of policies) {
      const entitlement = this.calculateProRatedEntitlement(
        policy,
        employee.hireDate,
        fiscalYear,
      );

      const balance = await this.balanceRepository.create(
        {
          employeeId: employee.id,
          policyId: policy.id,
          totalEntitlement: entitlement,
          usedDays: 0,
          remainingDays: entitlement,
          fiscalYear,
          status: entitlement > 0 ? BalanceStatus.ACTIVE : BalanceStatus.EXHAUSTED,
        },
        client,
      );

      balances.push(balance);
    }

    return balances;
  }

  async deductOnApproval(
    employeeId: string,
    leaveType: LeaveType,
    days: number,
    fiscalYear: number,
    client?: PoolClient,
  ): Promise<LeaveBalance> {
    const policy = await this.findActivePolicy(leaveType, client);
    if (!policy) {
      throw new Error(`No active leave policy found for leave type: ${leaveType}`);
    }

    const balance = await this.balanceRepository.findByEmployeeAndPolicy(
      employeeId,
      policy.id,
      fiscalYear,
      client,
    );

    if (!balance) {
      throw new Error(
        `No leave balance found for employee ${employeeId}, leave type ${leaveType}, fiscal year ${fiscalYear}`,
      );
    }

    if (balance.remainingDays < days) {
      throw new Error(
        `Insufficient leave balance: requested ${days} days, but only ${balance.remainingDays} remaining`,
      );
    }

    const updated = await this.balanceRepository.deductDays(balance.id, days, client);
    if (!updated) {
      throw new Error(
        `Failed to deduct days from balance ${balance.id}`,
      );
    }

    return updated;
  }

  async releaseOnRejectionOrCancellation(
    employeeId: string,
    leaveType: LeaveType,
    days: number,
    fiscalYear: number,
    client?: PoolClient,
  ): Promise<LeaveBalance> {
    const policy = await this.findActivePolicy(leaveType, client);
    if (!policy) {
      throw new Error(`No active leave policy found for leave type: ${leaveType}`);
    }

    const balance = await this.balanceRepository.findByEmployeeAndPolicy(
      employeeId,
      policy.id,
      fiscalYear,
      client,
    );

    if (!balance) {
      throw new Error(
        `No leave balance found for employee ${employeeId}, leave type ${leaveType}, fiscal year ${fiscalYear}`,
      );
    }

    const updated = await this.balanceRepository.restoreDays(balance.id, days, client);
    if (!updated) {
      throw new Error(
        `Failed to restore days to balance ${balance.id}`,
      );
    }

    return updated;
  }

  async getRemainingDays(
    employeeId: string,
    leaveType: LeaveType,
    fiscalYear?: number,
    client?: PoolClient,
  ): Promise<number> {
    const balance = await this.getBalance(employeeId, leaveType, fiscalYear, client);
    if (!balance) {
      return 0;
    }
    return balance.remainingDays;
  }

  private async findActivePolicy(
    leaveType: LeaveType,
    client?: PoolClient,
  ): Promise<LeavePolicy | null> {
    const policies = await this.policyRepository.findByLeaveType(leaveType, client);
    return policies.find((p) => p.isActive) ?? null;
  }

  private calculateProRatedEntitlement(
    policy: LeavePolicy,
    hireDate: Date,
    fiscalYear: number,
  ): number {
    const hireYear = hireDate.getUTCFullYear();

    // If hired in a previous fiscal year, full entitlement
    if (hireYear < fiscalYear) {
      return policy.entitlementDays;
    }

    // If hired in a future fiscal year (shouldn't happen), no entitlement
    if (hireYear > fiscalYear) {
      return 0;
    }

    // Hired in the same fiscal year — pro-rate by whole months remaining
    const hireMonth = hireDate.getUTCMonth(); // 0-indexed (Jan = 0)
    // Whole months remaining = months after the hire month through December
    // e.g., hired in March (month 2) → April (3) through December (11) = 8 months
    // Actually: months remaining = 11 - hireMonth
    // If hired in January (month 0): 11 - 0 = 11 months
    // If hired in December (month 11): 11 - 11 = 0 months
    const wholeMonthsRemaining = 11 - hireMonth;

    if (wholeMonthsRemaining <= 0) {
      return 0;
    }

    // Pro-rate: entitlementDays * wholeMonthsRemaining / 12, rounded down
    return Math.floor(policy.entitlementDays * wholeMonthsRemaining / 12);
  }
}
