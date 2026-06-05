import { LeaveType, LeaveStatus } from '../../shared/types';

/**
 * Interface representing a leave request.
 */
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

/**
 * Data Transfer Object for creating a leave request.
 */
export interface CreateLeaveRequestDto {
  employeeId: string;
  leaveType: LeaveType;
  startDate: Date;
  endDate: Date;
  reason?: string;
}
