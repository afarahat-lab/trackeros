export type LeaveRequestStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'cancelled';

export interface LeaveRequest {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  startDate: Date;
  endDate: Date;
  status: LeaveRequestStatus;
  reason?: string;
  approverId?: string;
  approverComment?: string;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateLeaveRequestDto {
  employeeId: string;
  leaveTypeId: string;
  startDate: Date;
  endDate: Date;
  reason?: string;
}

export interface UpdateLeaveRequestDto {
  startDate?: Date;
  endDate?: Date;
  reason?: string;
}
