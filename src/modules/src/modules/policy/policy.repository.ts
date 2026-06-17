import { LeavePolicy } from './policy.model';

export interface ILeavePolicyRepository {
  findById(id: string): Promise<LeavePolicy | null>;
  findAllActive(): Promise<LeavePolicy[]>;
  findByLeaveType(leaveType: LeavePolicy['leaveType']): Promise<LeavePolicy[]>;
}
