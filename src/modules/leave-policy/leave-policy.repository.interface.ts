import { LeavePolicy } from './leave-policy.model';

export interface CreateLeavePolicyDto {
  policyName: string;
  leaveTypeId: string;
  entitlementDays: number;
  accrualRate?: number;
  maxAccumulation?: number;
  minimumNoticeDays?: number;
  requiresManagerApproval?: boolean;
  isActive?: boolean;
}

export interface UpdateLeavePolicyDto {
  policyName?: string;
  leaveTypeId?: string;
  entitlementDays?: number;
  accrualRate?: number;
  maxAccumulation?: number;
  minimumNoticeDays?: number;
  requiresManagerApproval?: boolean;
  isActive?: boolean;
}

export interface ILeavePolicyRepository {
  findAll(): Promise<LeavePolicy[]>;
  findById(id: string): Promise<LeavePolicy | null>;
  findByLeaveTypeId(leaveTypeId: string): Promise<LeavePolicy[]>;
  findActiveByLeaveTypeId(leaveTypeId: string): Promise<LeavePolicy[]>;
  create(dto: CreateLeavePolicyDto): Promise<LeavePolicy>;
  update(id: string, dto: UpdateLeavePolicyDto): Promise<LeavePolicy | null>;
  delete(id: string): Promise<boolean>;
}
