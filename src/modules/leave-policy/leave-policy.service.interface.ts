import { LeavePolicy } from './leave-policy.model';
import { LeaveType } from '../../shared/types/leave.types';

export interface ILeavePolicyService {
  findByLeaveType(leaveType: LeaveType): Promise<LeavePolicy[]>;
  getEntitlement(leaveType: LeaveType): Promise<number | null>;
  requiresManagerApproval(leaveType: LeaveType): Promise<boolean | null>;
  getMinimumNoticeDays(leaveType: LeaveType): Promise<number | null>;
}
