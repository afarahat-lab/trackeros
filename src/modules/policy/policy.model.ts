import type { BaseEntity } from '../../shared/types/base-entity.interface';
import type { LeaveType } from '../../shared/types/enums';

export interface LeavePolicy extends BaseEntity {
  policyName: string;
  leaveType: LeaveType;
  entitlementDays: number;
  accrualRate: number | null;
  maxAccumulation: number | null;
  minimumNoticeDays: number | null;
  requiresManagerApproval: boolean;
  isActive: boolean;
}
