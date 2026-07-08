import { LeavePolicy } from './policy.model';
import { LeaveType } from '../../shared/types/leave.types';

export interface IPolicyService {
  getPolicyByLeaveType(leaveType: LeaveType): Promise<LeavePolicy[]>;
  getPolicyById(id: string): Promise<LeavePolicy | null>;
  getAllActivePolicies(): Promise<LeavePolicy[]>;
  createPolicy(policy: Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeavePolicy>;
  updatePolicy(
    id: string,
    policy: Partial<Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<LeavePolicy | null>;
  deactivatePolicy(id: string): Promise<boolean>;
}
