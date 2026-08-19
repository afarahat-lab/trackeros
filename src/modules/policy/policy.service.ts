import { LeavePolicy } from './policy.model';
import { ILeavePolicyRepository } from './policy.repository';
import {
  ILeavePolicyService,
  CreateLeavePolicyDto,
  UpdateLeavePolicyDto,
} from './policy.service.interface';
import { LeaveType } from '../../shared/types/index';

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

const VALID_LEAVE_TYPES: ReadonlySet<string> = new Set(Object.values(LeaveType));

function validatePolicyName(name: string): void {
  if (!name || name.trim().length === 0) {
    throw new ValidationError('policyName is required and must not be empty');
  }
}

function validateLeaveType(leaveType: LeaveType): void {
  if (!leaveType || !VALID_LEAVE_TYPES.has(leaveType)) {
    throw new ValidationError('leaveType must be a valid LeaveType');
  }
}

function validateEntitlementDays(days: number): void {
  if (!Number.isInteger(days) || days <= 0) {
    throw new ValidationError('entitlementDays must be a positive integer');
  }
}

function validateNonNegative(value: number | null | undefined, field: string): void {
  if (value !== null && value !== undefined && value < 0) {
    throw new ValidationError(`${field} must be non-negative when provided`);
  }
}

export class LeavePolicyService implements ILeavePolicyService {
  constructor(private readonly repository: ILeavePolicyRepository) {}

  async getById(id: string): Promise<LeavePolicy | null> {
    return this.repository.findById(id);
  }

  async getAll(): Promise<LeavePolicy[]> {
    return this.repository.findAll();
  }

  async getByLeaveType(leaveType: LeaveType): Promise<LeavePolicy[]> {
    return this.repository.findByLeaveType(leaveType);
  }

  async getActive(): Promise<LeavePolicy[]> {
    return this.repository.findActive();
  }

  async create(data: CreateLeavePolicyDto): Promise<LeavePolicy> {
    validatePolicyName(data.policyName);
    validateLeaveType(data.leaveType);
    validateEntitlementDays(data.entitlementDays);
    validateNonNegative(data.accrualRate, 'accrualRate');
    validateNonNegative(data.maxAccumulation, 'maxAccumulation');
    validateNonNegative(data.minimumNoticeDays, 'minimumNoticeDays');

    return this.repository.create({
      policyName: data.policyName.trim(),
      leaveType: data.leaveType,
      entitlementDays: data.entitlementDays,
      accrualRate: data.accrualRate ?? null,
      maxAccumulation: data.maxAccumulation ?? null,
      minimumNoticeDays: data.minimumNoticeDays ?? null,
      requiresManagerApproval: data.requiresManagerApproval ?? true,
      isActive: true,
    });
  }

  async update(id: string, data: UpdateLeavePolicyDto): Promise<LeavePolicy | null> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      return null;
    }

    if (data.entitlementDays !== undefined) {
      validateEntitlementDays(data.entitlementDays);
    }
    if (data.leaveType !== undefined) {
      validateLeaveType(data.leaveType);
    }
    if (data.policyName !== undefined) {
      validatePolicyName(data.policyName);
    }
    validateNonNegative(data.accrualRate, 'accrualRate');
    validateNonNegative(data.maxAccumulation, 'maxAccumulation');
    validateNonNegative(data.minimumNoticeDays, 'minimumNoticeDays');

    const updateData: Partial<LeavePolicy> = { ...data, updatedAt: new Date() };
    return this.repository.update(id, updateData);
  }

  async deactivate(id: string): Promise<boolean> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      return false;
    }

    if (!existing.isActive) {
      return true;
    }

    const result = await this.repository.update(id, {
      isActive: false,
      updatedAt: new Date(),
    });
    return result !== null;
  }
}
