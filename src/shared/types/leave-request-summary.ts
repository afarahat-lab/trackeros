import { LeaveType } from './leave-type';
import { LeaveRequestStatus } from './leave-request-status';

export interface LeaveRequestSummary {
  id: string;
  employeeId: string;
  leaveType: LeaveType;
  startDate: Date;
  endDate: Date;
  status: LeaveRequestStatus;
  dayCount: number;
}
