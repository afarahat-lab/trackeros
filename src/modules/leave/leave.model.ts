export type LeaveRequestStatus = 'draft' | 'submitted' | 'pending_approval' | 'approved' | 'rejected' | 'cancelled';

export interface LeaveRequest {
  id: string;
  employeeId: string;
  policyId: string;
  startDate: Date;
  endDate: Date;
  totalDays: number;
  status: LeaveRequestStatus;
  reason: string | null;
  managerId: string | null;
  reviewedAt: Date | null;
  reviewNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
}
