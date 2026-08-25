import { LeavePolicy } from './policy.model';
import { IPolicyRepository } from './policy.repository.interface';
import { IPolicyService } from './policy.service.interface';
import { LeaveType } from 'shared/types';

export class PolicyService implements IPolicyService {
  constructor(private readonly repository: IPolicyRepository) {}

  async getById(id: string): Promise<LeavePolicy | null> {
    return this.repository.findById(id);
  }

  async getByLeaveType(leaveType: LeaveType): Promise<LeavePolicy | null> {
    return this.repository.findActiveByLeaveType(leaveType);
  }

  async getAllActive(): Promise<LeavePolicy[]> {
    return this.repository.findActive();
  }

  async validatePolicyExists(policyId: string): Promise<LeavePolicy> {
    const policy = await this.repository.findById(policyId);

    if (!policy) {
      throw new Error(`Policy not found: ${policyId}`);
    }

    if (!policy.isActive) {
      throw new Error(`Policy is inactive: ${policyId}`);
    }

    return policy;
  }
}
