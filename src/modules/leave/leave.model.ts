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
  startDate: Date;
  endDate: Date;
  totalDays: number;
  reason?: string;
}
