import { LeaveStatus } from '../../shared/types';

export interface LeaveRequest {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  startDate: Date;
  endDate: Date;
  totalDays: number;
  reason: string;
  status: LeaveStatus;
  managerId: string;
  approvedBy: string | null;
  approvedAt: Date | null;
  rejectionReason: string | null;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateLeaveRequestDto {
  employeeId: string;
  leaveTypeId: string;
  startDate: Date;
  endDate: Date;
  totalDays: number;
  reason: string;
  managerId: string;
}
