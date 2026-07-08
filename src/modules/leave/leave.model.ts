import { LeaveRequestStatus } from '../../shared/types/leave.types';

export interface LeaveRequest {
  id: string;
  employeeId: string;
  leavePolicyId: string;
  startDate: Date;
  endDate: Date;
  reason: string;
  status: LeaveRequestStatus;
  approvedBy: string | null;
  approvedAt: Date | null;
  rejectedBy: string | null;
  rejectedAt: Date | null;
  rejectionReason: string | null;
  cancelledBy: string | null;
  cancelledAt: Date | null;
  cancellationReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateLeaveRequestDto = Pick<
  LeaveRequest,
  'employeeId' | 'leavePolicyId' | 'startDate' | 'endDate' | 'reason'
>;

export type UpdateLeaveRequestDto = Partial<
  Pick<LeaveRequest, 'startDate' | 'endDate' | 'reason'>
>;

export type LeaveRequestQueryParams = Partial<
  Pick<LeaveRequest, 'employeeId' | 'leavePolicyId' | 'status'>
>;
