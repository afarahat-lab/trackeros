import { LeaveType } from 'shared/types/leave.types';
import {
  LeavePolicy,
  IPolicyRepository,
  PolicyNotFoundError,
} from './policy.model';

export class PolicyService {
  constructor(private readonly policyRepo: IPolicyRepository) {}

  async getById(id: string): Promise<LeavePolicy> {
    const policy = await this.policyRepo.findById(id);
    if (!policy) {
      throw new PolicyNotFoundError(`id: ${id}`);
    }
    return policy;
  }

  async getByLeaveType(leaveType: LeaveType): Promise<LeavePolicy> {
    const policy = await this.policyRepo.findByLeaveType(leaveType);
    if (!policy) {
      throw new PolicyNotFoundError(`leaveType: ${leaveType}`);
    }
    return policy;
  }

  async getAllActive(): Promise<LeavePolicy[]> {
    return this.policyRepo.findAllActive();
  }

  async create(
    data: Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<LeavePolicy> {
    if (data.entitlementDays <= 0) {
      throw new Error('entitlementDays must be greater than 0');
    }
    return this.policyRepo.create(data);
  }

  async update(
    id: string,
    data: Partial<LeavePolicy>
  ): Promise<LeavePolicy> {
    if (data.entitlementDays !== undefined && data.entitlementDays <= 0) {
      throw new Error('entitlementDays must be greater than 0');
    }

    const existing = await this.policyRepo.findById(id);
    if (!existing) {
      throw new PolicyNotFoundError(`id: ${id}`);
    }

    const updated = await this.policyRepo.update(id, data);
    if (!updated) {
      throw new PolicyNotFoundError(`id: ${id}`);
    }
    return updated;
  }

  async getEntitlementForType(leaveType: LeaveType): Promise<number> {
    const policy = await this.policyRepo.findByLeaveType(leaveType);
    if (!policy || !policy.isActive) {
      throw new PolicyNotFoundError(`leaveType: ${leaveType}`);
    }
    return policy.entitlementDays;
  }
}
