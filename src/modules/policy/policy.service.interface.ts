import { LeaveType } from '../../shared/types';
import { LeavePolicy } from './policy.model';

export type CreateLeavePolicyInput = Omit<
  LeavePolicy,
  'id' | 'createdAt' | 'updatedAt'
>;

export interface IPolicyService {
  create(input: CreateLeavePolicyInput): Promise<LeavePolicy>;
  update(id: string, changes: Partial<LeavePolicy>): Promise<LeavePolicy | null>;
  activate(id: string): Promise<LeavePolicy | null>;
  deactivate(id: string): Promise<LeavePolicy | null>;
  findByLeaveType(leaveType: LeaveType): Promise<LeavePolicy | null>;
}
