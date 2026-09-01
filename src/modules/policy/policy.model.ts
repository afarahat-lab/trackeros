import { PoolClient } from 'pg';
import { LeaveType } from '../../shared/types';

export interface LeavePolicy {
  id: string;
  policyName: string;
  leaveType: LeaveType;
  entitlementDays: number;
  accrualRate: number | undefined;
  maxAccumulation: number | undefined;
  minimumNoticeDays: number | undefined;
  requiresManagerApproval: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ILeavePolicyRepository {
  create(policy: LeavePolicy): Promise<LeavePolicy>;
  list(client?: PoolClient): Promise<LeavePolicy[]>;
  findById(id: string): Promise<LeavePolicy | null>;
  findByLeaveType(leaveType: LeaveType, client?: PoolClient): Promise<LeavePolicy | null>;
  findActiveByLeaveType(leaveType: LeaveType, client?: PoolClient): Promise<LeavePolicy | null>;
  update(id: string, changes: Partial<LeavePolicy>): Promise<LeavePolicy | null>;
}
