import { LeavePolicy } from './policy.model';

export interface ILeavePolicyRepository {
  findAll(query?: any): Promise<LeavePolicy[]>;
  findById(id: string): Promise<LeavePolicy | null>;
  findByName(name: string): Promise<LeavePolicy | null>;
  create(policy: Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeavePolicy>;
  update(id: string, data: Partial<LeavePolicy>): Promise<LeavePolicy>;
  deactivate(id: string): Promise<LeavePolicy>;
}
