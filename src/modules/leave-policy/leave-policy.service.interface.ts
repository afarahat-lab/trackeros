import { LeavePolicy } from './leave-policy.model';

export interface ILeavePolicyService {
  getPolicyForLeaveType(leaveTypeId: string): Promise<LeavePolicy | null>;
}
