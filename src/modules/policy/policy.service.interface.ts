import { LeavePolicy, CreateLeavePolicyInput } from './policy.model';

export interface IPolicyService {
  createLeavePolicy(input: CreateLeavePolicyInput): Promise<LeavePolicy>;
  getLeavePolicyById(id: string): Promise<LeavePolicy>;
}
