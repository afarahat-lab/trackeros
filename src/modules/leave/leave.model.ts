import { LeaveType, LeaveStatus } from '../../shared/types/index';

export interface LeaveRequest {
  id: string;
  employeeId: string;
  managerId: string | null;
  leaveType: string;
  startDate: Date;
  endDate: Date;
  totalDays: number;
  reason: string | null;
  attachmentUrl: string | null;
  submittedAt: Date | null;
  status: 'DRAFT' | 'SUBMITTED' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'IN_PROGRESS' | 'COMPLETED';
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateLeaveRequestDto {
  employeeId: string;
  managerId: string | null;
  leaveType: string;
  startDate: Date;
  endDate: Date;
  totalDays: number;
  reason?: string;
  attachmentUrl?: string;
}

export interface UpdateLeaveRequestDto {
  managerId?: string | null;
  leaveType?: string;
  startDate?: Date;
  endDate?: Date;
  totalDays?: number;
  reason?: string | null;
  attachmentUrl?: string | null;
}

export interface LeaveQueryParams {
  employeeId?: string;
  managerId?: string;
  leaveType?: string;
  status?: string;
  startDateFrom?: Date;
  startDateTo?: Date;
  endDateFrom?: Date;
  endDateTo?: Date;
  page?: number;
  limit?: number;
  sortBy?: 'startDate' | 'endDate' | 'submittedAt' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}
