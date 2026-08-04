import { LeaveStatus } from '../../shared/types/index';

export interface LeaveRequest {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  startDate: Date;
  endDate: Date;
  reason: string | undefined;
  status: LeaveStatus;
  approvedBy: string | null;
  approvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateLeaveRequestDto {
  employeeId: string;
  leaveTypeId: string;
  startDate: Date;
  endDate: Date;
  reason?: string;
}

export interface UpdateLeaveRequestDto {
  startDate?: Date;
  endDate?: Date;
  reason?: string;
}

export interface LeaveRequestQueryParams {
  status?: LeaveStatus;
  leaveTypeId?: string;
  startDateFrom?: Date;
  startDateTo?: Date;
  endDateFrom?: Date;
  endDateTo?: Date;
  limit?: number;
  offset?: number;
}
