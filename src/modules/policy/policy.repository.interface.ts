import { LeavePolicy } from '../../shared/types';

export interface IPolicyRepository {
  findByLeaveTypeId(leaveTypeId: string): Promise<LeavePolicy | null>;
  findAll(): Promise<LeavePolicy[]>;
  create(policy: Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeavePolicy>;
  update(id: string, updates: Partial<LeavePolicy>): Promise<LeavePolicy>;
  delete(id: string): Promise<void>;
}
