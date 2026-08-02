import { LeaveStatus } from '../../shared/types/index';

export interface LeaveRequest {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  startDate: Date;
  endDate: Date;
  reason: string | undefined;
  rejectionReason: string | undefined;
  status: LeaveStatus;
  approvedBy: string | null;
  approvedAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
