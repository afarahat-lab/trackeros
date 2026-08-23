import { LeaveType, BaseEntity } from 'shared/types/leave.types';

export interface LeavePolicy extends BaseEntity {
  policyName: string;
  leaveType: LeaveType;
  entitlementDays: number;
  accrualRate: number | undefined;
  maxAccumulation: number | undefined;
  minimumNoticeDays: number | undefined;
  requiresManagerApproval: boolean;
  isActive: boolean;
}

export class PolicyNotFoundError extends Error {
  constructor(identifier: string) {
    super(`Policy not found: ${identifier}`);
    this.name = 'PolicyNotFoundError';
  }
}

export class DuplicateLeaveTypeError extends Error {
  constructor(leaveType: LeaveType) {
    super(`A policy already exists for leave type "${leaveType}"`);
    this.name = 'DuplicateLeaveTypeError';
  }
}

export interface IPolicyRepository {
  findById(id: string): Promise<LeavePolicy | null>;
  findByLeaveType(leaveType: LeaveType): Promise<LeavePolicy | null>;
  findAllActive(): Promise<LeavePolicy[]>;
  create(
    policy: Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<LeavePolicy>;
  update(
    id: string,
    data: Partial<LeavePolicy>
  ): Promise<LeavePolicy | null>;
}
