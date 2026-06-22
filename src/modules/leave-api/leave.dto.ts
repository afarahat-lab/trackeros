export interface SubmitLeaveDto {
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  reason?: string;
}

export interface ApproveLeaveDto {
  comment?: string;
}

export interface RejectLeaveDto {
  comment: string;
}

export interface LeaveHistoryQueryDto {
  employeeId?: string;
  status?: string;
  year?: string;
}
