import { LeaveStatus } from 'shared/types';

export interface LeaveRequest {
  id: string;
  employeeId: string;
  leavePolicyId: string;
  startDate: Date;
  endDate: Date;
  reason: string | undefined;
  status: LeaveStatus;
  approvedBy: string | null;
  approvedAt: Date | null;
  cancelledBy: string | null;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateLeaveRequestDto {
  employeeId: string;
  leavePolicyId: string;
  startDate: Date;
  endDate: Date;
  reason?: string;
}

export interface UpdateLeaveRequestDto {
  startDate?: Date;
  endDate?: Date;
  reason?: string;
  status?: LeaveStatus;
}

export interface LeaveRequestQueryParams {
  employeeId?: string;
  status?: LeaveStatus;
  leavePolicyId?: string;
  startDate?: Date;
  endDate?: Date;
}
