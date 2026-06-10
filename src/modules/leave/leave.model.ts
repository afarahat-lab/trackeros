// Leave Model

import { LeaveType } from '../../shared/types/index';

/**
 * LeaveRequest represents a leave request made by an employee.
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
 * CreateLeaveRequestDto is the data transfer object for creating a leave request.
 */
export interface CreateLeaveRequestDto {
  employeeId: string;
  leaveType: LeaveType;
  startDate: Date;
  endDate: Date;
  status: string;
}
