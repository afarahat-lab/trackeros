import { LeaveBalance } from './leave-balance.model';
import { ILeaveBalanceRepository } from './leave-balance.repository';
import { ILeavePolicyRepository } from '../leave-policy';
import { IBalanceService } from './leave-balance.service.interface';

export class BalanceService implements IBalanceService {
  constructor(
    private readonly balanceRepo: ILeaveBalanceRepository,
    private readonly policyRepo: ILeavePolicyRepository,
  ) {}

  async getBalance(
    employeeId: string,
    leavePolicyId: string,
    fiscalYear: number,
  ): Promise<LeaveBalance> {
    const balance = await this.balanceRepo.findByEmployeeAndPolicy(
      employeeId,
      leavePolicyId,
      fiscalYear,
    );
    if (!balance) {
      throw { error: 'Leave balance not found', code: 'BALANCE_NOT_FOUND' };
    }
    return balance;
  }

  async getBalancesForEmployee(
    employeeId: string,
    fiscalYear: number,
  ): Promise<LeaveBalance[]> {
    return this.balanceRepo.findByEmployeeId(employeeId, fiscalYear);
  }

  async initializeBalance(
    employeeId: string,
    leavePolicyId: string,
    fiscalYear: number,
  ): Promise<LeaveBalance> {
    const policy = await this.policyRepo.findById(leavePolicyId);
    if (!policy) {
      throw { error: 'Leave policy not found', code: 'POLICY_NOT_FOUND' };
    }

    const balance = await this.balanceRepo.create({
      employeeId,
      leavePolicyId,
      totalEntitlement: policy.entitlementDays,
      usedDays: 0,
      remainingDays: policy.entitlementDays,
      fiscalYear,
      status: 'ACTIVE',
    });

    return balance;
  }
}
