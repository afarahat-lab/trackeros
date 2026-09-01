import type { PoolClient } from 'pg';

import type { LeaveType } from '../../shared/types';
import type {
  LeavePolicy,
  CreateLeavePolicyInput,
  UpdateLeavePolicyInput,
} from './policy.model';
import { LeavePolicyRepository } from './policy.repository';
import type { ILeavePolicyRepository } from './policy.repository';
import type { ILeavePolicyService } from './policy.service.interface';

export class LeavePolicyService implements ILeavePolicyService {
  private readonly repository: ILeavePolicyRepository;

  constructor(repository?: ILeavePolicyRepository) {
    this.repository = repository ?? new LeavePolicyRepository();
  }

  create(input: CreateLeavePolicyInput, client?: PoolClient): Promise<LeavePolicy> {
    return this.repository.create(input, client);
  }

  findById(id: string): Promise<LeavePolicy | null> {
    return this.repository.findById(id);
  }

  findByLeaveType(leaveType: LeaveType): Promise<LeavePolicy[]> {
    return this.repository.findByLeaveType(leaveType);
  }

  findActive(): Promise<LeavePolicy[]> {
    return this.repository.findActive();
  }

  update(id: string, changes: UpdateLeavePolicyInput, client?: PoolClient): Promise<LeavePolicy> {
    return this.repository.update(id, changes, client);
  }
}
