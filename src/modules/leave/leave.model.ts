export type LeaveType = 'ANNUAL' | 'SICK' | 'PERSONAL' | 'MATERNITY' | 'PATERNITY';

export type LeaveRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface LeaveRequest {
  id: string;
  employeeId: string;
  leaveType: LeaveType;
  startDate: Date;
  endDate: Date;
  status: LeaveRequestStatus;
  reason?: string;
  managerId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateLeaveRequestDto {
  employeeId: string;
  leaveType: LeaveType;
  startDate: Date;
  endDate: Date;
  reason?: string;
  managerId?: string;
}

export interface LeaveRequestQuery {
  status?: LeaveRequestStatus;
  leaveType?: LeaveType;
  startDate?: Date;
  endDate?: Date;
}
