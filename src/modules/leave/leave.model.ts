export type LeaveType = 'annual' | 'sick' | 'emergency' | 'unpaid' | 'maternity' | 'paternity';

export interface LeaveRequest {
  id: string;
  employeeId: string;
  policyId: string;
  startDate: Date;
  endDate: Date;
  totalDays: number;
  reason?: string;
  status: 'draft' | 'submitted' | 'pending_approval' | 'approved' | 'rejected' | 'cancelled';
  managerId?: string;
  managerNotes?: string;
  submittedAt?: Date;
  decidedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateLeaveRequestDto {
  employeeId: string;
  policyId: string;
  leaveType: LeaveType;
  startDate: Date;
  endDate: Date;
  totalDays: number;
  reason?: string;
}

export interface UpdateLeaveRequestDto {
  status?: LeaveRequest['status'];
  managerNotes?: string;
  decidedAt?: Date;
}

export interface LeaveRequestQuery {
  employeeId?: string;
  status?: LeaveRequest['status'];
  startDate?: Date;
  endDate?: Date;
  managerId?: string;
}
