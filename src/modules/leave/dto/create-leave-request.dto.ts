import { LeaveRequest } from '../leave.model';

export interface CreateLeaveRequestDto {
  employeeId: string;
  policyId: string;
  startDate: Date;
  endDate: Date;
  totalDays: number;
  reason?: string | null;
  managerId?: string | null;
}

export interface UpdateLeaveRequestDto {
  startDate?: Date;
  endDate?: Date;
  totalDays?: number;
  reason?: string | null;
  managerId?: string | null;
  status?: LeaveRequest['status'];
  reviewNotes?: string | null;
}

export interface LeaveRequestResponseDto {
  id: string;
  employeeId: string;
  policyId: string;
  startDate: Date;
  endDate: Date;
  totalDays: number;
  status: LeaveRequest['status'];
  reason: string | null;
  managerId: string | null;
  reviewedAt: Date | null;
  reviewNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
}
