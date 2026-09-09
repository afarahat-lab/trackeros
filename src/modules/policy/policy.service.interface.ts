import { LeaveTypeCode } from '../../shared/types';
import { LeavePolicy, CreateLeavePolicyInput } from './policy.model';

export interface IPolicyService {
  createLeavePolicy(input: CreateLeavePolicyInput): Promise<LeavePolicy>;
  getLeavePolicyById(id: string): Promise<LeavePolicy>;
  getPolicyByLeaveTypeCode(leaveTypeCode: LeaveTypeCode): Promise<LeavePolicy>;
}
