
import { LeaveRequestStatus } from '../../shared/types';

export interface LeaveRequest {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  leavePolicyId: string;
  startDate: Date;
  endDate: Date;
  daysCount: number;
  reason: string | undefined;
  status: LeaveRequestStatus;
  approvedBy: string | null;
  approvedAt: Date | null;
  cancelledBy: string | null;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
