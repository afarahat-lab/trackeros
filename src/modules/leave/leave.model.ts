import { LeaveRequestStatus } from '../../shared/types/leave-request-status.enum';

export interface LeaveRequest {
  id: string;
  employeeId: string;
  leavePolicyId: string;
  startDate: Date;
  endDate: Date;
  reason: string | undefined;
  status: LeaveRequestStatus;
  approvedBy: string | null;
  approvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
