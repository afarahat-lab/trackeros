import { LeavePolicy } from './leave-policy.model';
import { LeaveTypeCode } from '../../shared/types';

export interface ILeavePolicyService {
  getPolicyForLeaveType(leaveTypeCode: LeaveTypeCode): Promise<LeavePolicy>;

  getActivePolicies(): Promise<LeavePolicy[]>;

  calculateEntitlement(
    policy: LeavePolicy,
    hireDate: Date,
    fiscalYear: number,
  ): number;

  validatePolicy(policy: LeavePolicy): boolean;
}
