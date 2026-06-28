import { ILeavePolicyRepository } from './policy.repository';
import { IPolicyService } from './policy.service.interface';
import { LeaveType } from '../../shared/types/leave.types';
import { LeavePolicy } from './policy.model';

export class PolicyService implements IPolicyService {
  constructor(private readonly policyRepository: ILeavePolicyRepository) {}

  async getPolicyForLeaveType(leaveType: LeaveType): Promise<LeavePolicy | null> {
    try {
      return await this.policyRepository.findByLeaveType(leaveType);
    } catch (error) {
      throw new Error(`Failed to fetch policy for leave type: ${leaveType}`);
    }
  }

  async getAllPolicies(): Promise<LeavePolicy[]> {
    try {
      return await this.policyRepository.findAll();
    } catch (error) {
      throw new Error('Failed to fetch all policies');
    }
  }

  async validateEntitlement(leaveType: LeaveType, requestedDays: number): Promise<boolean> {
    try {
      const policy = await this.policyRepository.findByLeaveType(leaveType);
      if (!policy) {
        return false;
      }
      return requestedDays <= policy.entitlementDays;
    } catch (error) {
      throw new Error(`Failed to validate entitlement for leave type: ${leaveType}`);
    }
  }
}
