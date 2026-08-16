import { IPolicyService } from './policy.service.interface';
import { IPolicyRepository } from './policy.repository';
import { LeavePolicy } from './policy.model';
import { LeaveType } from '../../shared/types/leave-type.enum';

export class PolicyService implements IPolicyService {
  constructor(private readonly policyRepository: IPolicyRepository) {}

  async getById(id: string): Promise<LeavePolicy | null> {
    return this.policyRepository.findById(id);
  }

  async getByLeaveType(leaveType: LeaveType): Promise<LeavePolicy | null> {
    return this.policyRepository.findByLeaveType(leaveType);
  }

  async getAllActive(): Promise<LeavePolicy[]> {
    return this.policyRepository.findAllActive();
  }
}
