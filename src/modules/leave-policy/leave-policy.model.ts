import { LeaveType } from '../../shared/types';

export interface LeavePolicy {
  id: string;
  policyName: string;
  leaveType: LeaveType;
  entitlementDays: number;
  accrualRate: number | undefined;
  maxAccumulation: number | undefined;
  minimumNoticeDays: number;
  requiresManagerApproval: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ILeavePolicyRepository {
  findById(id: string): Promise<LeavePolicy | null>;
  findByLeaveType(leaveType: LeaveType): Promise<LeavePolicy | null>;
  findAllActive(): Promise<LeavePolicy[]>;
  create(policy: Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeavePolicy>;
  update(id: string, data: Partial<LeavePolicy>): Promise<LeavePolicy | null>;
}

export interface ILeavePolicyService {
  getPolicyForLeaveType(leaveType: LeaveType): Promise<LeavePolicy | null>;
  validateEntitlement(employeeId: string, leaveType: LeaveType, requestedDays: number): Promise<boolean>;
}
