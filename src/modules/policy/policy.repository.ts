import { LeavePolicy } from './policy.model';

export interface ILeavePolicyRepository {
  findAll(): Promise<LeavePolicy[]>;
  findById(id: string): Promise<LeavePolicy | null>;
  findByLeaveType(leaveType: string): Promise<LeavePolicy | null>;
  findByStatus(status: 'ACTIVE' | 'INACTIVE'): Promise<LeavePolicy[]>;
  create(policy: Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeavePolicy>;
  update(id: string, updates: Partial<LeavePolicy>): Promise<LeavePolicy | null>;
}
