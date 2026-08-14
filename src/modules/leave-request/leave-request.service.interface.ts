import { LeaveRequest } from './leave-request.model';
import { LeaveType } from '../../shared/types/leave.types';

export interface ILeaveRequestService {
  submit(
    employeeId: string,
    leaveType: LeaveType,
    startDate: Date,
    endDate: Date,
    reason?: string,
  ): Promise<LeaveRequest>;

  approve(requestId: string, approverId: string): Promise<LeaveRequest>;

  reject(requestId: string, approverId: string): Promise<LeaveRequest>;

  cancel(requestId: string, employeeId: string): Promise<LeaveRequest>;

  findById(requestId: string): Promise<LeaveRequest | null>;

  findByEmployeeId(employeeId: string): Promise<LeaveRequest[]>;

  findPendingByManagerId(managerId: string): Promise<LeaveRequest[]>;
}
