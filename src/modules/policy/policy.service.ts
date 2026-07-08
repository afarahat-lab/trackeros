import { LeavePolicy } from './policy.model';
import { ILeavePolicyRepository } from './policy.repository';
import { IPolicyService } from './policy.service.interface';
import { LeaveType } from '../../shared/types/leave.types';

export class PolicyService implements IPolicyService {
  constructor(private readonly policyRepository: ILeavePolicyRepository) {}

  async getPolicyByLeaveType(leaveType: LeaveType): Promise<LeavePolicy[]> {
    return this.policyRepository.findByLeaveType(leaveType);
  }

  async getPolicyById(id: string): Promise<LeavePolicy | null> {
    return this.policyRepository.findById(id);
  }

  async getAllActivePolicies(): Promise<LeavePolicy[]> {
    return this.policyRepository.findAll({ isActive: true });
  }

  async createPolicy(
    policy: Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<LeavePolicy> {
    return this.policyRepository.create(policy);
  }

  async updatePolicy(
    id: string,
    policy: Partial<Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<LeavePolicy | null> {
    return this.policyRepository.update(id, policy);
  }

  async deactivatePolicy(id: string): Promise<boolean> {
    return this.policyRepository.softDelete(id);
  }
}
