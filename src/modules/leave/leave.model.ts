import { LeaveType } from '../../shared/types/index';

export enum LeaveRequestStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled'
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  startDate: Date;
  endDate: Date;
  daysRequested: number;
  status: LeaveRequestStatus;
  reason: string | null;
  managerId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateLeaveRequestDto {
  employeeId: string;
  leaveTypeId: string;
  startDate: Date;
  endDate: Date;
  daysRequested: number;
  reason?: string;
  managerId?: string;
}

export interface UpdateLeaveRequestDto {
  status?: LeaveRequestStatus;
  reason?: string;
  managerId?: string;
  startDate?: Date;
  endDate?: Date;
  daysRequested?: number;
}
