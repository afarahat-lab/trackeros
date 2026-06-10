// LeaveRequest interface definition

export interface LeaveRequest {
  id: string;
  employeeId: string;
  leaveType: string;
  startDate: Date;
  endDate: Date;
  status: string;
}

export interface CreateLeaveRequestDto {
  employeeId: string;
  leaveType: string;
  startDate: Date;
  endDate: Date;
  status: string;
}

import { LeaveType } from '../../shared/types/index';