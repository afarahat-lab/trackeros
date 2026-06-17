import { LeavePolicy, LeaveType } from './policy.model';
import { ILeavePolicyRepository } from './policy.repository';

export interface ILeavePolicyService {
  getActivePolicies(): Promise<LeavePolicy[]>;
  getPolicyById(id: string): Promise<LeavePolicy | null>;
  getPoliciesByType(leaveType: LeaveType): Promise<LeavePolicy[]>;
}

export class LeavePolicyService implements ILeavePolicyService {
  constructor(private readonly leavePolicyRepository: ILeavePolicyRepository) {}

  async getActivePolicies(): Promise<LeavePolicy[]> {
    // Implementation will be added in Phase 3
    throw new Error('Not implemented');
  }

  async getPolicyById(id: string): Promise<LeavePolicy | null> {
    // Implementation will be added in Phase 3
    throw new Error('Not implemented');
  }

  async getPoliciesByType(leaveType: LeaveType): Promise<LeavePolicy[]> {
    // Implementation will be added in Phase 3
    throw new Error('Not implemented');
  }
}
