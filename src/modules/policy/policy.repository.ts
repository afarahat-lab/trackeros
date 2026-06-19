import { LeavePolicy, LeavePolicyQueryParams } from './policy.model';

export interface ILeavePolicyRepository {
  findById(id: string): Promise<LeavePolicy | null>;
  findByPolicyName(policyName: string): Promise<LeavePolicy | null>;
  findByQuery(params: LeavePolicyQueryParams): Promise<LeavePolicy[]>;
  findAllActive(): Promise<LeavePolicy[]>;
  create(policy: Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeavePolicy>;
  update(id: string, policy: Partial<Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>>): Promise<LeavePolicy>;
  delete(id: string): Promise<void>;
}
