
import { LeavePolicy } from './leave-policy.model';
import { LeaveType } from '../../shared/types';

export interface ILeavePolicyService {
  findById(id: string): Promise<LeavePolicy | null>;
  findByLeaveType(leaveType: LeaveType): Promise<LeavePolicy | null>;
  getAllActive(): Promise<LeavePolicy[]>;
  getEntitlementDays(policyId: string): Promise<number>;
  requiresManagerApproval(policyId: string): Promise<boolean>;
  getMinimumNoticeDays(policyId: string): Promise<number | undefined>;
  createPolicy(data: Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeavePolicy>;
  updatePolicy(id: string, data: Partial<Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>>): Promise<LeavePolicy | null>;
  deactivatePolicy(id: string): Promise<boolean>;
}
