import { LeaveType, LeaveStatus } from '../../shared/types/index';

export interface LeaveRequest {
  id: string;
  employeeId: string;
  leaveType: LeaveType;
  status: LeaveStatus;
  startDate: Date;
  endDate: Date;
  reason?: string;
  managerId: string;
}

export interface CreateLeaveRequestDto {
  employeeId: string;
  leaveType: LeaveType;
  startDate: Date;
  endDate: Date;
  reason?: string;
}
