import { LeaveType, LeaveRequestStatus } from '../../shared/types/leave.types';

export interface LeaveRequest {
  id: string;
  employeeId: string;
  leaveType: LeaveType;
  leavePolicyId: string;
  startDate: Date;
  endDate: Date;
  totalDays: number;
  reason: string;
  status: LeaveRequestStatus;
  managerId: string | null;
  managerComment: string | null;
  submittedAt: Date | null;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateLeaveRequestDto {
  employeeId: string;
  leaveType: LeaveType;
  leavePolicyId: string;
  startDate: Date;
  endDate: Date;
  totalDays: number;
  reason: string;
  managerId: string | null;
  managerComment: string | null;
}
