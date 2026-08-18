import { LeavePolicy } from './leave-policy.model';
import { ILeavePolicyRepository } from './leave-policy.repository';
import { LeaveType } from 'shared/types';
import { NotFoundError } from 'shared/error-types';

export interface ILeavePolicyService {
  getById(id: string): Promise<LeavePolicy>;
  getByLeaveType(leaveType: LeaveType): Promise<LeavePolicy>;
  getActivePolicies(): Promise<LeavePolicy[]>;
  isLeaveTypeActive(leaveType: LeaveType): Promise<boolean>;
}

export class LeavePolicyService implements ILeavePolicyService {
  constructor(private readonly leavePolicyRepository: ILeavePolicyRepository) {}

  async getById(id: string): Promise<LeavePolicy> {
    const policy = await this.leavePolicyRepository.findById(id);
    if (!policy) {
      throw new NotFoundError(`LeavePolicy with id ${id} not found`);
    }
    return policy;
  }

  async getByLeaveType(leaveType: LeaveType): Promise<LeavePolicy> {
    const policy = await this.leavePolicyRepository.findByLeaveType(leaveType);
    if (!policy) {
      throw new NotFoundError(`LeavePolicy for leave type ${leaveType} not found`);
    }
    return policy;
  }

  async getActivePolicies(): Promise<LeavePolicy[]> {
    return this.leavePolicyRepository.findActive();
  }

  async isLeaveTypeActive(leaveType: LeaveType): Promise<boolean> {
    const policy = await this.leavePolicyRepository.findByLeaveType(leaveType);
    return policy !== null && policy.isActive;
  }
}
