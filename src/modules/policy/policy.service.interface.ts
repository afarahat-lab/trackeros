import { LeavePolicy } from './policy.model';
import { LeaveType } from '../../shared/types/index';

export interface CreateLeavePolicyDto {
  policyName: string;
  leaveType: LeaveType;
  entitlementDays: number;
  accrualRate?: number | null;
  maxAccumulation?: number | null;
  minimumNoticeDays?: number | null;
  requiresManagerApproval?: boolean;
}

export interface UpdateLeavePolicyDto {
  policyName?: string;
  leaveType?: LeaveType;
  entitlementDays?: number;
  accrualRate?: number | null;
  maxAccumulation?: number | null;
  minimumNoticeDays?: number | null;
  requiresManagerApproval?: boolean;
  isActive?: boolean;
}

export interface ILeavePolicyService {
  getById(id: string): Promise<LeavePolicy | null>;
  getAll(): Promise<LeavePolicy[]>;
  getByLeaveType(leaveType: LeaveType): Promise<LeavePolicy[]>;
  getActive(): Promise<LeavePolicy[]>;
  create(data: CreateLeavePolicyDto): Promise<LeavePolicy>;
  update(id: string, data: UpdateLeavePolicyDto): Promise<LeavePolicy | null>;
  deactivate(id: string): Promise<boolean>;
}
