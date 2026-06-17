export interface LeaveRequest {
  id: string;
  employeeId: string;
  policyId: string;
  startDate: Date;
  endDate: Date;
  totalDays: number;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  reviewedBy?: string;
  reviewedAt?: Date;
  reviewNotes?: string;
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
  status?: 'pending' | 'approved' | 'rejected' | 'cancelled';
  reviewedBy?: string;
  reviewNotes?: string;
}

export interface LeaveRequestQuery {
  employeeId?: string;
  status?: 'pending' | 'approved' | 'rejected' | 'cancelled';
  startDateFrom?: Date;
  startDateTo?: Date;
  policyId?: string;
}
