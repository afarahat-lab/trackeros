import { LeaveRequestStatus } from '../leave.model';

export interface CreateLeaveRequestDto {
  employeeId: string;
  policyId: string;
  startDate: Date;
  endDate: Date;
  totalDays: number;
  reason?: string | null;
  managerId?: string | null;
}

export interface SubmitLeaveRequestDto {
  leaveRequestId: string;
}

export interface ReviewLeaveRequestDto {
  leaveRequestId: string;
  status: LeaveRequestStatus;
  reviewNotes?: string | null;
}

export interface CancelLeaveRequestDto {
  leaveRequestId: string;
}

export interface LeaveRequestDto {
  id: string;
  employeeId: string;
  policyId: string;
  startDate: Date;
  endDate: Date;
  totalDays: number;
  status: LeaveRequestStatus;
  reason: string | null;
  managerId: string | null;
  reviewedAt: Date | null;
  reviewNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
}
