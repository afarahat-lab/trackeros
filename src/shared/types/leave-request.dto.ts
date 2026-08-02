import { LeaveRequestStatus } from './enums';

export interface CreateLeaveRequestDto {
  employeeId: string;
  leavePolicyId: string;
  startDate: Date;
  endDate: Date;
  reason?: string;
}

export interface UpdateLeaveRequestDto {
  status?: LeaveRequestStatus;
  rejectionReason?: string;
}
