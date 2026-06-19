import { LeaveRequestStatus } from './leave.model';

export interface CreateLeaveRequestDto {
  employeeId: string;
  policyId: string;
  startDate: Date;
  endDate: Date;
  reason?: string;
}

export interface SubmitLeaveRequestDto {
  requestId: string;
  employeeId: string;
}

export interface ReviewLeaveRequestDto {
  requestId: string;
  managerId: string;
  reviewNotes?: string;
}

export interface CancelLeaveRequestDto {
  requestId: string;
  employeeId: string;
  reason?: string;
}

export interface LeaveRequestDto {
  id: string;
  employeeId: string;
  policyId: string;
  startDate: Date;
  endDate: Date;
  totalDays: number;
  status: LeaveRequestStatus;
  reason?: string;
  managerId?: string;
  reviewedAt?: Date;
  reviewNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}
