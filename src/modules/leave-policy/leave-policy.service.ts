import { LeavePolicy } from './leave-policy.model';
import { ILeavePolicyRepository } from './leave-policy.repository';
import { LeaveType } from 'shared/types';

export interface ILeavePolicyService {
  getById(id: string): Promise<LeavePolicy | null>;
  getByLeaveType(leaveType: LeaveType): Promise<LeavePolicy | null>;
  getActivePolicies(): Promise<LeavePolicy[]>;
  isLeaveTypeActive(leaveType: LeaveType): Promise<boolean>;
}

export class LeavePolicyService implements ILeavePolicyService {
  constructor(private readonly leavePolicyRepository: ILeavePolicyRepository) {}

  async getById(id: string): Promise<LeavePolicy | null> {
    const policy = await this.leavePolicyRepository.findById(id);
    return policy ?? null;
  }

  async getByLeaveType(leaveType: LeaveType): Promise<LeavePolicy | null> {
    const policy = await this.leavePolicyRepository.findByLeaveType(leaveType);
    return policy ?? null;
  }

  async getActivePolicies(): Promise<LeavePolicy[]> {
    return this.leavePolicyRepository.findActive();
  }

  async isLeaveTypeActive(leaveType: LeaveType): Promise<boolean> {
    const policy = await this.leavePolicyRepository.findByLeaveType(leaveType);
    return policy !== null && policy.isActive;
  }
}
