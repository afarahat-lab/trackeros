import { LeaveStatus } from '../../shared/types/leave.types';

export interface LeaveRequest {
  id: string;
  employeeId: string;
  policyId: string;
  startDate: Date;
  endDate: Date;
  totalDays: number;
  reason?: string;
  status: LeaveStatus;
  managerId?: string;
  approvedAt?: Date;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateLeaveRequestDto {
  employeeId: string;
  policyId: string;
  startDate: Date;
  endDate: Date;
  reason?: string;
}

export interface UpdateLeaveRequestDto {
  status?: LeaveStatus;
  managerId?: string;
  rejectionReason?: string;
}

export interface LeaveRequestQuery {
  employeeId?: string;
  policyId?: string;
  status?: LeaveStatus;
  startDateFrom?: Date;
  startDateTo?: Date;
  endDateFrom?: Date;
  endDateTo?: Date;
  managerId?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'startDate' | 'endDate' | 'totalDays';
  sortOrder?: 'ASC' | 'DESC';
}
