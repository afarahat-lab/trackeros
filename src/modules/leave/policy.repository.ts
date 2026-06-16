import { LeavePolicy } from './leave.model';

export interface ILeavePolicyRepository {
  findById(id: string): Promise<LeavePolicy | null>;
  findByLeaveType(leaveType: LeavePolicy['leaveType']): Promise<LeavePolicy[]>;
  findActivePolicies(): Promise<LeavePolicy[]>;
}

export class LeavePolicyRepository implements ILeavePolicyRepository {
  constructor(private readonly db: any) {}

  async findById(id: string): Promise<LeavePolicy | null> {
    // Implementation will be added in phase 2
    throw new Error('Not implemented');
  }

  async findByLeaveType(leaveType: LeavePolicy['leaveType']): Promise<LeavePolicy[]> {
    // Implementation will be added in phase 2
    throw new Error('Not implemented');
  }

  async findActivePolicies(): Promise<LeavePolicy[]> {
    // Implementation will be added in phase 2
    throw new Error('Not implemented');
  }
}
