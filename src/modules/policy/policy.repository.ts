import { LeavePolicy } from './policy.model';

export interface ILeavePolicyRepository {
  findByLeaveType(leaveType: string): Promise<LeavePolicy | null>;
  findAllActive(): Promise<LeavePolicy[]>;
  findById(id: string): Promise<LeavePolicy | null>;
  create(policy: Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeavePolicy>;
  update(id: string, updates: Partial<LeavePolicy>): Promise<LeavePolicy | null>;
  delete(id: string): Promise<boolean>;
}
