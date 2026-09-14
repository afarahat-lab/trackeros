import { ValidationError, NotFoundError } from '../../shared/errors';
import { LeaveTypeCode } from '../../shared/types';
import { ILeaveTypeService } from '../leave-type';
import { LeavePolicy, CreateLeavePolicyInput, LeavePolicyStatus } from './policy.model';
import { IPolicyRepository } from './policy.repository.interface';
import { IPolicyService } from './policy.service.interface';

export class PolicyService implements IPolicyService {
  constructor(
    private readonly repository: IPolicyRepository,
    private readonly leaveTypeService: ILeaveTypeService,
  ) {}

  async createLeavePolicy(input: CreateLeavePolicyInput): Promise<LeavePolicy> {
    this.validate(input);

    if (
      input.effectiveFrom &&
      input.effectiveTo &&
      input.effectiveFrom > input.effectiveTo
    ) {
      throw new ValidationError('effectiveFrom must not be after effectiveTo');
    }

    await this.leaveTypeService.getLeaveTypeByCode(input.leaveTypeCode);

    return this.repository.create(input);
  }

  async getLeavePolicyById(id: string): Promise<LeavePolicy> {
    const policy = await this.repository.findById(id);
    if (!policy) {
      throw new NotFoundError('Leave policy not found');
    }
    return policy;
  }

  async getPolicyByLeaveTypeCode(leaveTypeCode: LeaveTypeCode): Promise<LeavePolicy> {
    const policy = await this.repository.findByLeaveTypeCode(leaveTypeCode);
    if (!policy) {
      throw new NotFoundError('Leave policy not found');
    }
    return policy;
  }

  /**
   * Returns the single policy in effect per leaveTypeCode at `asOf`, or an empty
   * array when no policy matches. A policy is in effect when status is ACTIVE,
   * effectiveFrom <= asOf, and (effectiveTo is null OR effectiveTo >= asOf); when
   * multiple rows still match, the latest effectiveFrom wins.
   */
  async listEffectivePolicies(asOf: Date): Promise<LeavePolicy[]> {
    const rows = await this.repository.findAll();

    const filtered = rows.filter((p) => {
      if (p.status !== LeavePolicyStatus.ACTIVE) return false;
      if (p.effectiveFrom.getTime() > asOf.getTime()) return false;
      if (p.effectiveTo !== null && p.effectiveTo.getTime() < asOf.getTime()) return false;
      return true;
    });

    const byType = new Map<LeaveTypeCode, LeavePolicy>();
    for (const policy of filtered) {
      const current = byType.get(policy.leaveTypeCode);
      if (!current || policy.effectiveFrom.getTime() > current.effectiveFrom.getTime()) {
        byType.set(policy.leaveTypeCode, policy);
      }
    }

    return [...byType.values()];
  }

  private validate(input: CreateLeavePolicyInput): void {
    if (typeof input.policyName !== 'string' || input.policyName.trim() === '') {
      throw new ValidationError('Invalid policyName');
    }

    if (
      typeof input.annualEntitlementDays !== 'number' ||
      !Number.isInteger(input.annualEntitlementDays) ||
      input.annualEntitlementDays <= 0
    ) {
      throw new ValidationError('Invalid annualEntitlementDays');
    }

    if (
      typeof input.accrualPeriodMonths !== 'number' ||
      !Number.isInteger(input.accrualPeriodMonths) ||
      input.accrualPeriodMonths <= 0
    ) {
      throw new ValidationError('Invalid accrualPeriodMonths');
    }

    if (
      typeof input.maxRequestDays !== 'number' ||
      !Number.isInteger(input.maxRequestDays) ||
      input.maxRequestDays < 0
    ) {
      throw new ValidationError('Invalid maxRequestDays');
    }

    if (
      typeof input.minNoticeDays !== 'number' ||
      !Number.isInteger(input.minNoticeDays) ||
      input.minNoticeDays < 0
    ) {
      throw new ValidationError('Invalid minNoticeDays');
    }

    if (
      typeof input.carryForwardDays !== 'number' ||
      !Number.isInteger(input.carryForwardDays) ||
      input.carryForwardDays < 0
    ) {
      throw new ValidationError('Invalid carryForwardDays');
    }

    if (!(input.effectiveFrom instanceof Date) || isNaN(input.effectiveFrom.getTime())) {
      throw new ValidationError('Invalid effectiveFrom');
    }

    if (!Object.values(LeavePolicyStatus).includes(input.status)) {
      throw new ValidationError('Invalid status');
    }
  }
}
