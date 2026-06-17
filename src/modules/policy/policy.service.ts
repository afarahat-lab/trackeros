import { LeavePolicy, LeavePolicyQuery } from './policy.model';
import { ILeavePolicyRepository } from './policy.repository';

export interface ILeavePolicyService {
  getAllPolicies(query?: LeavePolicyQuery): Promise<LeavePolicy[]>;
  getPolicyById(id: string): Promise<LeavePolicy | null>;
  getPolicyByName(policyName: string): Promise<LeavePolicy | null>;
  createPolicy(policy: Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeavePolicy>;
  updatePolicy(id: string, updates: Partial<LeavePolicy>): Promise<LeavePolicy>;
  deactivatePolicy(id: string): Promise<LeavePolicy>;
}

export class LeavePolicyService implements ILeavePolicyService {
  constructor(
    private readonly leavePolicyRepository: ILeavePolicyRepository
  ) {}

  async getAllPolicies(query?: LeavePolicyQuery): Promise<LeavePolicy[]> {
    throw new Error('Not implemented');
  }

  async getPolicyById(id: string): Promise<LeavePolicy | null> {
    throw new Error('Not implemented');
  }

  async getPolicyByName(policyName: string): Promise<LeavePolicy | null> {
    throw new Error('Not implemented');
  }

  async createPolicy(policy: Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeavePolicy> {
    throw new Error('Not implemented');
  }

  async updatePolicy(id: string, updates: Partial<LeavePolicy>): Promise<LeavePolicy> {
    throw new Error('Not implemented');
  }

  async deactivatePolicy(id: string): Promise<LeavePolicy> {
    throw new Error('Not implemented');
  }
}
