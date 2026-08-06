import { LeavePolicy } from './leave-policy.model';
import { LeaveType } from '../../shared/types';

export interface ILeavePolicyRepository {
  findById(id: string): Promise<LeavePolicy | null>;
  findByLeaveType(leaveType: LeaveType): Promise<LeavePolicy | null>;
  findAllActive(): Promise<LeavePolicy[]>;
  create(policy: Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeavePolicy>;
  update(id: string, policy: Partial<Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>>): Promise<LeavePolicy | null>;
  deactivate(id: string): Promise<boolean>;
}
