// Leave model for managing leave requests

import { LeaveType } from '../../shared/types/index';

/**
 * Interface representing a leave request.
 */
export interface LeaveRequest {
  id: string;
  employeeId: string;
  leaveType: LeaveType;
  startDate: Date;
  endDate: Date;
  status: string;
}

/**
 * Data Transfer Object for creating a leave request.
 */
export interface CreateLeaveRequestDto {
  employeeId: string;
  leaveType: LeaveType;
  startDate: Date;
  endDate: Date;
  status: string;
}
