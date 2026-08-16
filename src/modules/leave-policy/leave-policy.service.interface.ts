import { LeavePolicy } from './leave-policy.model';
import { LeaveType } from '../../shared/types';

export interface ILeavePolicyService {
  getPolicy(id: string): Promise<LeavePolicy>;
  getPolicyByType(leaveType: LeaveType): Promise<LeavePolicy>;
  isActive(id: string): Promise<boolean>;
}
