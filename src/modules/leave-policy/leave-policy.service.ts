import { LeaveType } from '../../shared/types';
import { ILeavePolicyRepository, ILeavePolicyService, LeavePolicy } from './leave-policy.model';

export class LeavePolicyService implements ILeavePolicyService {
  constructor(private readonly repository: ILeavePolicyRepository) {}

  async getPolicyForLeaveType(leaveType: LeaveType): Promise<LeavePolicy | null> {
    return this.repository.findByLeaveType(leaveType);
  }

  async validateEntitlement(
    employeeId: string,
    leaveType: LeaveType,
    requestedDays: number,
  ): Promise<boolean> {
    const policy = await this.repository.findByLeaveType(leaveType);
    if (policy === null) {
      return false;
    }
    return requestedDays <= policy.entitlementDays;
  }
}
