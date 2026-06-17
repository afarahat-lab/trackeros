import { ILeavePolicyRepository } from './policy.repository';
import { LeavePolicy } from './policy.model';

export class PolicyService {
  constructor(private readonly policyRepo: ILeavePolicyRepository) {}

  async findAll(): Promise<LeavePolicy[]> {
    return this.policyRepo.findAll();
  }

  async findById(id: string): Promise<LeavePolicy | null> {
    return this.policyRepo.findById(id);
  }
}
