export interface LeaveRequest {
  id: string;
  employeeId: string;
  leaveType: string;
  startDate: Date;
  endDate: Date;
  durationDays: number;
  reason: string;
  status: 'DRAFT' | 'SUBMITTED' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  managerId: string;
  submittedAt: Date | null;
  decidedAt: Date | null;
  decisionNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateLeaveRequestDto {
  employeeId: string;
  leaveType: string;
  startDate: Date;
  endDate: Date;
  reason: string;
  managerId: string;
}
