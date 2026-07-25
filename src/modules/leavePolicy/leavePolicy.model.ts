
import { PolicyStatus } from '../../shared/types/leave.enums';

export interface LeavePolicy {
  id: string;
  leaveTypeId: string;
  name: string;
  entitlementDaysPerYear: number;
  maxCarryForwardDays: number;
  minNoticeDays: number;
  maxConsecutiveDays: number | null;
  requiresApproval: boolean;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  status: PolicyStatus;
  createdAt: Date;
  updatedAt: Date;
}
