import { LeavePolicy } from './policy.model';

export interface PolicyRepository {
  findById(id: string): Promise<LeavePolicy | null>;
  findActiveByLeaveType(leaveType: LeavePolicy['leaveType']): Promise<LeavePolicy[]>;
  save(policy: Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>): Promise<LeavePolicy>;
  update(id: string, updates: Partial<Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>>): Promise<LeavePolicy | null>;
  softDelete(id: string): Promise<void>;
}
