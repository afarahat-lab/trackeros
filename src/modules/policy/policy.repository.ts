import { LeavePolicy, LeavePolicyQueryParams } from './policy.model';
import { LeaveType } from '../../shared/types/leave.types';

export interface ILeavePolicyRepository {
  findByLeaveType(leaveType: LeaveType): Promise<LeavePolicy[]>;
  findById(id: string): Promise<LeavePolicy | null>;
  findAll(params?: LeavePolicyQueryParams): Promise<LeavePolicy[]>;
  create(policy: Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeavePolicy>;
  update(id: string, policy: Partial<Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>>): Promise<LeavePolicy | null>;
  softDelete(id: string): Promise<boolean>;
}
