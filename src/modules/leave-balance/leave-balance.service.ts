import { ILeaveBalanceRepository } from './leave-balance.repository.interface';
import { ILeaveBalanceService } from './leave-balance.service.interface';
import { LeaveBalance } from './leave-balance.model';
import { ILeavePolicyService, AppError } from '../leave-policy';

export class LeaveBalanceService implements ILeaveBalanceService {
  constructor(
    private readonly balanceRepo: ILeaveBalanceRepository,
    private readonly policyService: ILeavePolicyService,
  ) {}

  async getBalancesForEmployee(
    employeeId: string,
    fiscalYear?: number,
  ): Promise<LeaveBalance[]> {
    if (fiscalYear !== undefined) {
      return this.balanceRepo.findByEmployeeIdAndFiscalYear(employeeId, fiscalYear);
    }
    return this.balanceRepo.findByEmployeeId(employeeId);
  }

  async initializeBalancesForEmployee(
    employeeId: string,
    hireDate: Date,
  ): Promise<LeaveBalance[]> {
    const policies = await this.policyService.getActivePolicies();
    if (policies.length === 0) {
      return [];
    }

    const fiscalYear = hireDate.getFullYear();

    const dtos = policies.map((policy) => {
      const entitlement = this.policyService.calculateEntitlement(
        policy,
        hireDate,
        fiscalYear,
      );

      return {
        employeeId,
        policyId: policy.id,
        totalEntitlement: entitlement,
        usedDays: 0,
        pendingDays: 0,
        fiscalYear,
        status: 'ACTIVE' as const,
      };
    });

    return this.balanceRepo.createBatch(dtos);
  }

  async getAvailableBalance(
    employeeId: string,
    policyId: string,
    fiscalYear: number,
  ): Promise<number> {
    const balance = await this.balanceRepo.findByEmployeeIdAndPolicyId(
      employeeId,
      policyId,
      fiscalYear,
    );

    if (!balance) {
      throw new AppError(
        `Balance not found for employee ${employeeId}, policy ${policyId}, fiscal year ${fiscalYear}`,
        'NOT_FOUND',
      );
    }

    return balance.remainingDays - balance.pendingDays;
  }

  async reserveDays(
    employeeId: string,
    policyId: string,
    days: number,
    fiscalYear: number,
  ): Promise<void> {
    const balance = await this.balanceRepo.findByEmployeeIdAndPolicyId(
      employeeId,
      policyId,
      fiscalYear,
    );

    if (!balance) {
      throw new AppError(
        `Balance not found for employee ${employeeId}, policy ${policyId}, fiscal year ${fiscalYear}`,
        'NOT_FOUND',
      );
    }

    const available = balance.remainingDays - balance.pendingDays;

    if (available < days) {
      throw new AppError(
        `Insufficient balance: requested ${days} day(s) but only ${available} available`,
        'INSUFFICIENT_BALANCE',
      );
    }

    await this.balanceRepo.update(balance.id, {
      pendingDays: balance.pendingDays + days,
    });
  }

  async finalizeDeduction(
    employeeId: string,
    policyId: string,
    days: number,
    fiscalYear: number,
  ): Promise<void> {
    const balance = await this.balanceRepo.findByEmployeeIdAndPolicyId(
      employeeId,
      policyId,
      fiscalYear,
    );

    if (!balance) {
      throw new AppError(
        `Balance not found for employee ${employeeId}, policy ${policyId}, fiscal year ${fiscalYear}`,
        'NOT_FOUND',
      );
    }

    await this.balanceRepo.update(balance.id, {
      pendingDays: balance.pendingDays - days,
      usedDays: balance.usedDays + days,
    });
  }

  async releaseReservation(
    employeeId: string,
    policyId: string,
    days: number,
    fiscalYear: number,
  ): Promise<void> {
    const balance = await this.balanceRepo.findByEmployeeIdAndPolicyId(
      employeeId,
      policyId,
      fiscalYear,
    );

    if (!balance) {
      throw new AppError(
        `Balance not found for employee ${employeeId}, policy ${policyId}, fiscal year ${fiscalYear}`,
        'NOT_FOUND',
      );
    }

    const newPendingDays = Math.max(0, balance.pendingDays - days);

    await this.balanceRepo.update(balance.id, {
      pendingDays: newPendingDays,
    });
  }
}
