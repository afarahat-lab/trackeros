import { LeavePolicy } from './policy.model';

export interface ILeavePolicyRepository {
  findById(id: string): Promise<LeavePolicy | null>;
  findByLeaveType(leaveType: string): Promise<LeavePolicy | null>;
  findAll(): Promise<LeavePolicy[]>;
  create(policy: Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeavePolicy>;
  update(id: string, updates: Partial<Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>>): Promise<LeavePolicy>;
  archive(id: string): Promise<void>;
}
