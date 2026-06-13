import { LeavePolicy } from './policy.model';

export interface ILeavePolicyRepository {
  findAll(): Promise<LeavePolicy[]>;
  findByLeaveType(leaveType: string): Promise<LeavePolicy | null>;
  findByStatus(status: LeavePolicy['status']): Promise<LeavePolicy[]>;
  findApplicablePolicies(employmentStatus: string): Promise<LeavePolicy[]>;
  findById(id: string): Promise<LeavePolicy | null>;
}
