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

const VALID_LEAVE_TYPES = new Set<string>(Object.values(LeaveType));

function validateLeaveType(leaveType: unknown): LeaveType {
  if (typeof leaveType !== 'string' || !VALID_LEAVE_TYPES.has(leaveType)) {
    throw new ValidationError(
      `leaveType must be a valid LeaveType enum member, got: ${String(leaveType)}`,
    );
  }
  return leaveType as LeaveType;
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
    if (!data.policyName || data.policyName.trim().length === 0) {
      throw new ValidationError('policyName is required and must not be empty');
    }

    const leaveType = validateLeaveType(data.leaveType);

    if (typeof data.entitlementDays !== 'number' || data.entitlementDays <= 0 || !Number.isFinite(data.entitlementDays)) {
      throw new ValidationError('entitlementDays must be a positive number');
    }

    return this.repository.create({
      policyName: data.policyName.trim(),
      leaveType,
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

    if (data.leaveType !== undefined) {
      validateLeaveType(data.leaveType);
    }

    if (data.policyName !== undefined && (data.policyName.trim().length === 0)) {
      throw new ValidationError('policyName must not be empty');
    }

    if (data.entitlementDays !== undefined && (typeof data.entitlementDays !== 'number' || data.entitlementDays <= 0 || !Number.isFinite(data.entitlementDays))) {
      throw new ValidationError('entitlementDays must be a positive number');
    }

    const updateData: Partial<LeavePolicy> = {
      ...data,
      policyName: data.policyName?.trim(),
      updatedAt: new Date(),
    };

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
