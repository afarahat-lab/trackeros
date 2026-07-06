
import { LeaveStatus } from '../../shared/types/leave.types';

export interface LeaveRequest {
  id: number;
  employeeId: number;
  leaveTypeId: number;
  startDate: Date;
  endDate: Date;
  reason: string;
  status: LeaveStatus;
  approvedBy: number | null;
  approvedAt: Date | null;
  rejectedBy: number | null;
  rejectedAt: Date | null;
  rejectionReason: string | null;
  cancelledBy: number | null;
  cancelledAt: Date | null;
  cancellationReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateLeaveRequestDto {
  employeeId: number;
  leaveTypeId: number;
  startDate: Date;
  endDate: Date;
  reason: string;
}

export interface UpdateLeaveRequestDto {
  startDate?: Date;
  endDate?: Date;
  reason?: string;
}

export interface LeaveRequestQueryParams {
  employeeId?: number;
  leaveTypeId?: number;
  status?: LeaveStatus;
  startDate?: Date;
  endDate?: Date;
}
