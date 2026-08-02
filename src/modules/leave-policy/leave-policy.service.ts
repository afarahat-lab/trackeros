import { LeavePolicy } from './leave-policy.model';
import { ILeavePolicyRepository } from './leave-policy.repository';
import { ILeavePolicyService } from './leave-policy.service.interface';

export class LeavePolicyService implements ILeavePolicyService {
  constructor(private readonly repository: ILeavePolicyRepository) {}

  async getActivePolicy(leaveTypeId: string): Promise<LeavePolicy | null> {
    return this.repository.findActiveByLeaveTypeId(leaveTypeId);
  }

  async getPolicyById(id: string): Promise<LeavePolicy | null> {
    return this.repository.findById(id);
  }

  async getAllPolicies(): Promise<LeavePolicy[]> {
    return this.repository.findAll();
  }

  async createPolicy(data: Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeavePolicy> {
    return this.repository.create(data);
  }

  async updatePolicy(id: string, data: Partial<LeavePolicy>): Promise<LeavePolicy | null> {
    return this.repository.update(id, data);
  }
}
