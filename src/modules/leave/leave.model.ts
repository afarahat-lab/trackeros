export interface LeaveRequest {
  id: string;
  employeeId: string;
  policyId: string;
  managerId: string | null;
  startDate: Date;
  endDate: Date;
  totalDays: number;
  reason: string | null;
  attachmentUrl: string | null;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  rejectionReason: string | null;
  submittedAt: Date | null;
  processedAt: Date | null;
  processorId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateLeaveRequestDto {
  employeeId: string;
  policyId: string;
  startDate: Date;
  endDate: Date;
  reason?: string;
  attachmentUrl?: string;
}
