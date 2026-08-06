
import { LeavePolicy } from './leave-policy.model';
import { ILeavePolicyRepository } from './leave-policy.repository.interface';
import { ILeavePolicyService } from './leave-policy.service.interface';
import { LeaveType } from '../../shared/types';
import { ValidationError, NotFoundError } from '../../shared/errors';

const VALID_LEAVE_TYPES: ReadonlySet<string> = new Set(Object.values(LeaveType));

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export class LeavePolicyService implements ILeavePolicyService {
  constructor(private readonly leavePolicyRepository: ILeavePolicyRepository) {}

  async findById(id: string): Promise<LeavePolicy | null> {
    if (!isNonEmptyString(id)) {
      throw new ValidationError('id must be a non-empty string');
    }
    return this.leavePolicyRepository.findById(id);
  }

  async findByLeaveType(leaveType: LeaveType): Promise<LeavePolicy | null> {
    if (!isNonEmptyString(leaveType) || !VALID_LEAVE_TYPES.has(leaveType)) {
      throw new ValidationError(
        `leaveType must be one of: ${Array.from(VALID_LEAVE_TYPES).join(', ')}`
      );
    }
    return this.leavePolicyRepository.findByLeaveType(leaveType);
  }

  async getAllActive(): Promise<LeavePolicy[]> {
    return this.leavePolicyRepository.findAllActive();
  }

  async getEntitlementDays(policyId: string): Promise<number> {
    if (!isNonEmptyString(policyId)) {
      throw new ValidationError('policyId must be a non-empty string');
    }

    const policy = await this.leavePolicyRepository.findById(policyId);
    if (!policy) {
      throw new NotFoundError(`LeavePolicy with id ${policyId} not found`);
    }

    return policy.entitlementDays;
  }

  async requiresManagerApproval(policyId: string): Promise<boolean> {
    if (!isNonEmptyString(policyId)) {
      throw new ValidationError('policyId must be a non-empty string');
    }

    const policy = await this.leavePolicyRepository.findById(policyId);
    if (!policy) {
      throw new NotFoundError(`LeavePolicy with id ${policyId} not found`);
    }

    return policy.requiresManagerApproval;
  }

  async getMinimumNoticeDays(policyId: string): Promise<number | undefined> {
    if (!isNonEmptyString(policyId)) {
      throw new ValidationError('policyId must be a non-empty string');
    }

    const policy = await this.leavePolicyRepository.findById(policyId);
    if (!policy) {
      throw new NotFoundError(`LeavePolicy with id ${policyId} not found`);
    }

    return policy.minimumNoticeDays;
  }

  async createPolicy(
    data: Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<LeavePolicy> {
    if (!isNonEmptyString(data.policyName)) {
      throw new ValidationError('policyName is required and must be a non-empty string');
    }
    if (!isNonEmptyString(data.leaveType) || !VALID_LEAVE_TYPES.has(data.leaveType)) {
      throw new ValidationError(
        `leaveType must be one of: ${Array.from(VALID_LEAVE_TYPES).join(', ')}`
      );
    }
    if (typeof data.entitlementDays !== 'number' || data.entitlementDays <= 0 || !Number.isFinite(data.entitlementDays)) {
      throw new ValidationError('entitlementDays must be a positive number');
    }

    try {
      return await this.leavePolicyRepository.create(data);
    } catch (error: unknown) {
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        throw error;
      }
      const message = error instanceof Error ? error.message : 'Unknown error creating leave policy';
      throw new Error(message);
    }
  }

  async updatePolicy(
    id: string,
    data: Partial<Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<LeavePolicy | null> {
    if (!isNonEmptyString(id)) {
      throw new ValidationError('id must be a non-empty string');
    }

    if (data.leaveType !== undefined && (!isNonEmptyString(data.leaveType) || !VALID_LEAVE_TYPES.has(data.leaveType))) {
      throw new ValidationError(
        `leaveType must be one of: ${Array.from(VALID_LEAVE_TYPES).join(', ')}`
      );
    }

    if (data.entitlementDays !== undefined && (typeof data.entitlementDays !== 'number' || data.entitlementDays <= 0 || !Number.isFinite(data.entitlementDays))) {
      throw new ValidationError('entitlementDays must be a positive number');
    }

    try {
      return await this.leavePolicyRepository.update(id, data);
    } catch (error: unknown) {
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        throw error;
      }
      const message = error instanceof Error ? error.message : 'Unknown error updating leave policy';
      throw new Error(message);
    }
  }

  async deactivatePolicy(id: string): Promise<boolean> {
    if (!isNonEmptyString(id)) {
      throw new ValidationError('policyId must be a non-empty string');
    }

    return this.leavePolicyRepository.deactivate(id);
  }
}
