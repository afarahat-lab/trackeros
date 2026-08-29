import type { PoolClient } from 'pg';

export interface LeavePolicy {
  id: string;
  policyName: string;
  leaveTypeId: string;
  entitlementDays: number;
  accrualRate: number | null;
  maxAccumulation: number | null;
  minimumNoticeDays: number | null;
  requiresManagerApproval: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateLeavePolicyInput = Omit<
  LeavePolicy,
  'id' | 'createdAt' | 'updatedAt'
>;
export type UpdateLeavePolicyInput = Partial<
  Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>
>;

export interface ILeavePolicyRepository {
  create(policy: LeavePolicy, client?: PoolClient): Promise<LeavePolicy>;
  update(policy: LeavePolicy, client?: PoolClient): Promise<LeavePolicy>;
  findById(id: string, client?: PoolClient): Promise<LeavePolicy | null>;
  findByLeaveTypeId(
    leaveTypeId: string,
    client?: PoolClient
  ): Promise<LeavePolicy[]>;
  findActive(client?: PoolClient): Promise<LeavePolicy[]>;
}

export interface IPolicyService {
  create(
    input: CreateLeavePolicyInput,
    client?: PoolClient
  ): Promise<LeavePolicy>;
  update(
    id: string,
    input: UpdateLeavePolicyInput,
    client?: PoolClient
  ): Promise<LeavePolicy>;
  findById(id: string, client?: PoolClient): Promise<LeavePolicy | null>;
  deactivate(id: string, client?: PoolClient): Promise<LeavePolicy>;
}
