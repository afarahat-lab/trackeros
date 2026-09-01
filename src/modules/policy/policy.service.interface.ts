import type { PoolClient } from 'pg';

import type { LeaveType } from '../../shared/types';
import type {
  LeavePolicy,
  CreateLeavePolicyInput,
  UpdateLeavePolicyInput,
} from './policy.model';

export interface ILeavePolicyService {
  create(input: CreateLeavePolicyInput, client?: PoolClient): Promise<LeavePolicy>;
  findById(id: string): Promise<LeavePolicy | null>;
  findByLeaveType(leaveType: LeaveType): Promise<LeavePolicy[]>;
  findActive(): Promise<LeavePolicy[]>;
  update(id: string, changes: UpdateLeavePolicyInput, client?: PoolClient): Promise<LeavePolicy>;
}
