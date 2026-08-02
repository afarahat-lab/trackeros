import type { BaseEntity } from '../../shared/types/base-entity.interface';
import type { LeaveRequestStatus } from '../../shared/types/enums';

export interface LeaveRequest extends BaseEntity {
  employeeId: string;
  leavePolicyId: string;
  startDate: Date;
  endDate: Date;
  reason: string | undefined;
  status: LeaveRequestStatus;
  approvedBy: string | null;
  approvedAt: Date | null;
  rejectedBy: string | null;
  rejectedAt: Date | null;
  rejectionReason: string | null;
  cancelledBy: string | null;
  cancelledAt: Date | null;
}
