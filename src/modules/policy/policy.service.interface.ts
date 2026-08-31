import { PoolClient } from 'pg';
import { LeaveType } from '../../shared/types';
import { LeavePolicy } from './policy.model';

export type CreateLeavePolicyInput = Omit<
  LeavePolicy,
  'id' | 'createdAt' | 'updatedAt'
>;

export interface IPolicyService {
  create(input: CreateLeavePolicyInput): Promise<LeavePolicy>;
  update(
    id: string,
    changes: Partial<LeavePolicy>,
    client?: PoolClient,
  ): Promise<LeavePolicy | null>;
  activate(id: string, client?: PoolClient): Promise<LeavePolicy | null>;
  deactivate(id: string, client?: PoolClient): Promise<LeavePolicy | null>;
  findByLeaveType(
    leaveType: LeaveType,
    client?: PoolClient,
  ): Promise<LeavePolicy | null>;
  list(client?: PoolClient): Promise<LeavePolicy[]>;
  findById(id: string, client?: PoolClient): Promise<LeavePolicy | null>;
}
