
import { LeavePolicy } from './policy.model';
import { LeaveType } from '../../shared/types/index';

export interface ILeavePolicyRepository {
  findById(id: string): Promise<LeavePolicy | null>;
  findAll(): Promise<LeavePolicy[]>;
  findByLeaveType(leaveType: LeaveType): Promise<LeavePolicy[]>;
  findActive(): Promise<LeavePolicy[]>;
  create(policy: Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeavePolicy>;
  update(id: string, data: Partial<LeavePolicy>): Promise<LeavePolicy | null>;
  delete(id: string): Promise<boolean>;
}
