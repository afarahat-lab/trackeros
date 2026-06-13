export interface LeaveRequest {
  id: string;
  employeeId: string;
  leaveType: string;
  startDate: Date;
  endDate: Date;
  durationDays: number;
  reason?: string;
  status: 'DRAFT' | 'SUBMITTED' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  managerId?: string;
  submittedAt?: Date;
  reviewedAt?: Date;
  reviewerComments?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateLeaveRequestDto {
  employeeId: string;
  leaveType: string;
  startDate: Date;
  endDate: Date;
  durationDays: number;
  reason?: string;
  status?: 'DRAFT' | 'SUBMITTED' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  managerId?: string;
}
