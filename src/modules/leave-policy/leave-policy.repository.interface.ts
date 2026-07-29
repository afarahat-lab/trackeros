import { LeavePolicy } from './leave-policy.model';
import { LeaveType } from '../../shared/types/leave-type.enum';

export interface ILeavePolicyRepository {
  findAll(): Promise<LeavePolicy[]>;
  findById(id: string): Promise<LeavePolicy | null>;
  findByLeaveType(leaveType: LeaveType): Promise<LeavePolicy[]>;
  create(policy: Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeavePolicy>;
  update(id: string, policy: Partial<LeavePolicy>): Promise<LeavePolicy | null>;
  delete(id: string): Promise<boolean>;
}
