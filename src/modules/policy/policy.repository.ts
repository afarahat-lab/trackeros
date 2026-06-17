import { LeavePolicy } from './policy.model';

export interface ILeavePolicyRepository {
  findAll(): Promise<LeavePolicy[]>;
  findById(id: string): Promise<LeavePolicy | null>;
  findByLeaveType(leaveType: string): Promise<LeavePolicy | null>;
  create(policy: Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeavePolicy>;
  update(id: string, policy: Partial<Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>>): Promise<LeavePolicy | null>;
}
