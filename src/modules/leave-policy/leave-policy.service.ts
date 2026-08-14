import { ILeavePolicyService } from './leave-policy.service.interface';
import { ILeavePolicyRepository } from './leave-policy.repository';
import { LeavePolicy } from './leave-policy.model';
import { LeaveType } from '../../shared/types/leave.types';

export class LeavePolicyService implements ILeavePolicyService {
  constructor(private readonly leavePolicyRepository: ILeavePolicyRepository) {}

  async findByLeaveType(leaveType: LeaveType): Promise<LeavePolicy[]> {
    return this.leavePolicyRepository.findByLeaveType(leaveType);
  }

  async getEntitlement(leaveType: LeaveType): Promise<number | null> {
    const policies = await this.leavePolicyRepository.findByLeaveType(leaveType);
    const active = policies.find((p) => p.isActive);
    if (!active) {
      return null;
    }
    return active.entitlementDays;
  }

  async requiresManagerApproval(leaveType: LeaveType): Promise<boolean | null> {
    const policies = await this.leavePolicyRepository.findByLeaveType(leaveType);
    const active = policies.find((p) => p.isActive);
    if (!active) {
      return null;
    }
    return active.requiresManagerApproval;
  }

  async getMinimumNoticeDays(leaveType: LeaveType): Promise<number | null> {
    const policies = await this.leavePolicyRepository.findByLeaveType(leaveType);
    const active = policies.find((p) => p.isActive);
    if (!active) {
      return null;
    }
    return active.minimumNoticeDays;
  }
}
