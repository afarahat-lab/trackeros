import { LeaveType } from 'shared/types';
import { LeavePolicy } from './policy.model';

export interface IPolicyRepository {
  findById(id: string): Promise<LeavePolicy | null>;
  findByLeaveType(leaveType: LeaveType): Promise<LeavePolicy[]>;
  findActive(): Promise<LeavePolicy[]>;
  findActiveByLeaveType(leaveType: LeaveType): Promise<LeavePolicy | null>;
  create(policy: Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeavePolicy>;
  update(id: string, data: Partial<LeavePolicy>): Promise<LeavePolicy>;
}
