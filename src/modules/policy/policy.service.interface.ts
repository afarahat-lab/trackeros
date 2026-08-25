import { LeaveType } from 'shared/types';
import { LeavePolicy } from './policy.model';

export interface IPolicyService {
  getById(id: string): Promise<LeavePolicy | null>;
  getByLeaveType(leaveType: LeaveType): Promise<LeavePolicy | null>;
  getAllActive(): Promise<LeavePolicy[]>;
  validatePolicyExists(policyId: string): Promise<LeavePolicy>;
}
