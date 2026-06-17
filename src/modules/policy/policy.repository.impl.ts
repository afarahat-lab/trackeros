import { ILeavePolicyRepository } from './policy.repository';
import { LeavePolicy } from './policy.model';

export class LeavePolicyRepository implements ILeavePolicyRepository {
  async findAll(query?: any): Promise<LeavePolicy[]> {
    throw new Error('Not implemented');
  }
  async findById(id: string): Promise<LeavePolicy | null> {
    throw new Error('Not implemented');
  }
  async findByName(name: string): Promise<LeavePolicy | null> {
    throw new Error('Not implemented');
  }
  async create(policy: Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeavePolicy> {
    throw new Error('Not implemented');
  }
  async update(id: string, data: Partial<LeavePolicy>): Promise<LeavePolicy> {
    throw new Error('Not implemented');
  }
  async deactivate(id: string): Promise<LeavePolicy> {
    throw new Error('Not implemented');
  }
}
