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
   * Lists the single policy in effect for each leave type as of `asOf`.
   * At most one policy applies per leaveTypeCode (ACTIVE, effectiveFrom <= asOf,
   * and effectiveTo is null or >= asOf); if several still match, the one with the
   * latest effectiveFrom wins. Returns an empty array (never throws) when none apply.
   */
  async listEffectivePolicies(asOf: Date): Promise<LeavePolicy[]> {
    const all = await this.repository.findAll();
    const effective = all.filter(
      (policy) =>
        policy.status === LeavePolicyStatus.ACTIVE &&
        policy.effectiveFrom.getTime() <= asOf.getTime() &&
        (policy.effectiveTo === null || policy.effectiveTo.getTime() >= asOf.getTime())
    );

    const byType = new Map<LeaveTypeCode, LeavePolicy>();
    for (const policy of effective) {
      const current = byType.get(policy.leaveTypeCode);
      if (!current || policy.effectiveFrom.getTime() > current.effectiveFrom.getTime()) {
        byType.set(policy.leaveTypeCode, policy);
      }
    }

    return Array.from(byType.values());
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
