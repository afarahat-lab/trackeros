import { LeaveType, LeaveStatus } from '../../shared/types/index';

export interface LeaveRequest {
  id: number;
  employeeId: number;
  leaveType: LeaveType;
  startDate: Date;
  endDate: Date;
  reason: string;
  status: LeaveStatus;
  submittedAt: Date | null;
  reviewedBy: number | null;
  reviewedAt: Date | null;
  comments: string | null;
  managerId: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateLeaveRequestDto {
  employeeId: number;
  leaveType: LeaveType;
  startDate: Date;
  endDate: Date;
  reason: string;
  managerId?: number;
}
