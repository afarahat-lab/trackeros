import { LeavePolicy } from './leave-policy.model';
import { ILeavePolicyRepository } from './leave-policy.repository.interface';
import { ILeaveTypeRepository } from './leave-type.repository.interface';
import { LeaveTypeCode } from '../../shared/types';
import { ILeavePolicyService } from './leave-policy.service.interface';

export class AppError extends Error {
  public readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.code = code;
    this.name = 'AppError';
  }
}

export class LeavePolicyService implements ILeavePolicyService {
  constructor(
    private readonly policyRepo: ILeavePolicyRepository,
    private readonly typeRepo: ILeaveTypeRepository,
  ) {}

  async getPolicyForLeaveType(leaveTypeCode: LeaveTypeCode): Promise<LeavePolicy> {
    const leaveType = await this.typeRepo.findByCode(leaveTypeCode);

    if (!leaveType) {
      throw new AppError(
        `Leave type with code '${leaveTypeCode}' not found`,
        'NOT_FOUND',
      );
    }

    if (!leaveType.isActive) {
      throw new AppError(
        `Leave type '${leaveTypeCode}' is inactive`,
        'POLICY_VIOLATION',
      );
    }

    const activePolicies = await this.policyRepo.findActiveByLeaveTypeId(leaveType.id);

    if (activePolicies.length === 0) {
      throw new AppError(
        `No active policy found for leave type '${leaveTypeCode}'`,
        'POLICY_VIOLATION',
      );
    }

    if (activePolicies.length > 1) {
      throw new AppError(
        `Multiple active policies found for leave type '${leaveTypeCode}'`,
        'POLICY_VIOLATION',
      );
    }

    return activePolicies[0];
  }

  async getActivePolicies(): Promise<LeavePolicy[]> {
    const allPolicies = await this.policyRepo.findAll();
    return allPolicies.filter((p) => p.isActive);
  }

  calculateEntitlement(
    policy: LeavePolicy,
    hireDate: Date,
    fiscalYear: number,
  ): number {
    const fiscalYearStart = new Date(fiscalYear, 0, 1);

    let entitlement: number;

    if (hireDate < fiscalYearStart) {
      entitlement = policy.entitlementDays;
    } else {
      const hireMonth = hireDate.getMonth();
      const wholeMonthsRemaining = 11 - hireMonth;

      if (wholeMonthsRemaining <= 0) {
        entitlement = 0;
      } else {
        entitlement = Math.floor(
          policy.entitlementDays * (wholeMonthsRemaining / 12),
        );
      }
    }

    if (
      policy.maxAccumulation !== undefined &&
      policy.maxAccumulation !== null &&
      entitlement > policy.maxAccumulation
    ) {
      entitlement = policy.maxAccumulation;
    }

    return entitlement;
  }

  validatePolicy(policy: LeavePolicy): boolean {
    try {
      if (!policy || typeof policy !== 'object') {
        return false;
      }

      if (!policy.policyName || typeof policy.policyName !== 'string' || policy.policyName.trim().length === 0) {
        return false;
      }

      if (!policy.leaveTypeId || typeof policy.leaveTypeId !== 'string' || policy.leaveTypeId.trim().length === 0) {
        return false;
      }

      if (typeof policy.entitlementDays !== 'number' || policy.entitlementDays <= 0 || !Number.isInteger(policy.entitlementDays)) {
        return false;
      }

      if (policy.accrualRate !== undefined && policy.accrualRate !== null) {
        if (typeof policy.accrualRate !== 'number' || policy.accrualRate < 0) {
          return false;
        }
      }

      if (policy.maxAccumulation !== undefined && policy.maxAccumulation !== null) {
        if (typeof policy.maxAccumulation !== 'number' || policy.maxAccumulation < 0) {
          return false;
        }
      }

      if (policy.minimumNoticeDays !== undefined && policy.minimumNoticeDays !== null) {
        if (typeof policy.minimumNoticeDays !== 'number' || policy.minimumNoticeDays < 0 || !Number.isInteger(policy.minimumNoticeDays)) {
          return false;
        }
      }

      if (typeof policy.requiresManagerApproval !== 'boolean') {
        return false;
      }

      if (typeof policy.isActive !== 'boolean') {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }
}
