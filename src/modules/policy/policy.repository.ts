import { LeavePolicy } from './policy.model';

export interface LeavePolicyRepository {
  findById(id: string): Promise<LeavePolicy | null>;
  findByPolicyName(policyName: string): Promise<LeavePolicy | null>;
  findByLeaveType(leaveType: string): Promise<LeavePolicy[]>;
  findAllActive(): Promise<LeavePolicy[]>;
  save(policy: Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeavePolicy>;
  update(id: string, updates: Partial<Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>>): Promise<LeavePolicy | null>;
}
