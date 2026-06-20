import { LeaveRequest } from '../../shared/types/index';

export interface ILeaveService {
  createLeaveRequest(employeeId: string, leaveTypeId: string, startDate: Date, endDate: Date, reason?: string): Promise<LeaveRequest>;
  submitLeaveRequest(requestId: string, employeeId: string): Promise<LeaveRequest>;
  approveLeaveRequest(requestId: string, approverId: string): Promise<LeaveRequest>;
  rejectLeaveRequest(requestId: string, approverId: string, reason?: string): Promise<LeaveRequest>;
  cancelLeaveRequest(requestId: string, employeeId: string): Promise<LeaveRequest>;
  getLeaveRequest(requestId: string): Promise<LeaveRequest | null>;
  getLeaveRequestsByEmployee(employeeId: string, status?: string): Promise<LeaveRequest[]>;
  getPendingRequestsForManager(managerId: string): Promise<LeaveRequest[]>;
}
