import { LeavePolicy } from './policy.model';
import { LeaveType } from '../../shared/types/leave.types';

export interface IPolicyService {
  getPolicyForLeaveType(leaveType: LeaveType): Promise<LeavePolicy | null>;
  getAllPolicies(): Promise<LeavePolicy[]>;
  validateEntitlement(leaveType: LeaveType, requestedDays: number): Promise<boolean>;
}
