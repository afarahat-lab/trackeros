import { PoolClient } from 'pg';
import { LeavePolicy, CreateLeavePolicyInput, LeavePolicyStatus } from './policy.model';

export interface IPolicyRepository {
  create(input: CreateLeavePolicyInput, client?: PoolClient): Promise<LeavePolicy>;
  findById(id: string, client?: PoolClient): Promise<LeavePolicy | null>;
  findAll(client?: PoolClient): Promise<LeavePolicy[]>;
}
