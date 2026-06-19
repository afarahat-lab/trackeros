import { LeavePolicy } from './policy.model';

export interface ILeavePolicyRepository {
  findById(id: string): Promise<LeavePolicy | null>;
  findAllActive(): Promise<LeavePolicy[]>;
  findByLeaveType(leaveType: string): Promise<LeavePolicy[]>;
  findByName(policyName: string): Promise<LeavePolicy | null>;
  create(policy: Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeavePolicy>;
  update(id: string, policy: Partial<Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>>): Promise<LeavePolicy>;
  deactivate(id: string): Promise<LeavePolicy>;
}
