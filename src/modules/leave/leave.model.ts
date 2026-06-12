export interface LeaveRequest {
  id: string;
  employeeId: string;
  leaveType: 'ANNUAL' | 'SICK' | 'EMERGENCY';
  startDate: Date;
  endDate: Date;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  reason: string | null;
  managerId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateLeaveRequestDto {
  employeeId: string;
  leaveType: 'ANNUAL' | 'SICK' | 'EMERGENCY';
  startDate: Date;
  endDate: Date;
  reason?: string;
}
