export type LeaveType = 'annual' | 'sick' | 'personal' | 'maternity' | 'paternity';

export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface LeaveRequest {
  id: string;
  employeeId: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  status: LeaveStatus;
  reason?: string;
  managerId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLeaveRequestDto {
  employeeId: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  reason?: string;
  managerId?: string;
}

export interface LeaveRequestQuery {
  employeeId?: string;
  status?: LeaveStatus;
  startDate?: string;
  endDate?: string;
}
