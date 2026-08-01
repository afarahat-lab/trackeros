import { CreateLeaveRequestDto, LeaveRequestQueryParams } from '../../shared/types';
import { LeaveRequest } from './leave.model';

export interface ILeaveService {
  submitLeaveRequest(dto: CreateLeaveRequestDto): Promise<LeaveRequest>;
  approveLeaveRequest(requestId: string, approverId: string): Promise<LeaveRequest>;
  rejectLeaveRequest(requestId: string, approverId: string, reason: string): Promise<LeaveRequest>;
  cancelLeaveRequest(requestId: string, employeeId: string): Promise<LeaveRequest>;
  getLeaveRequest(requestId: string): Promise<LeaveRequest | null>;
  getEmployeeLeaveRequests(employeeId: string, params?: LeaveRequestQueryParams): Promise<LeaveRequest[]>;
}
