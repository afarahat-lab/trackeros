import { LeaveType, LeaveStatus } from '../../shared/types';

export interface LeaveRequest {
  id: number;
  employeeId: number;
  leaveType: LeaveType;
  startDate: Date;
  endDate: Date;
  status: LeaveStatus;
  reason?: string;
  createdAt: Date;
  updatedAt: Date;
}
