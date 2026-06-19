export interface CreateLeaveRequestDto {
  employeeId: string;
  policyId: string;
  startDate: string;
  endDate: string;
  reason?: string;
}

export interface SubmitLeaveRequestDto {
  requestId: string;
  employeeId: string;
}

export interface ReviewLeaveRequestDto {
  requestId: string;
  managerId: string;
  reviewNotes?: string;
}

export interface CancelLeaveRequestDto {
  requestId: string;
  employeeId: string;
}

export interface LeaveRequestQueryDto {
  employeeId?: string;
  managerId?: string;
  status?: string;
  fiscalYear?: number;
}
