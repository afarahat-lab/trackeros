import { LeaveRequest } from './leave-request.model';

export interface ILeaveRequestService {
  submitDraft(requestId: string, employeeId: string): Promise<LeaveRequest>;
  approveRequest(requestId: string, approverId: string): Promise<LeaveRequest>;
  rejectRequest(requestId: string, approverId: string, rejectionReason: string): Promise<LeaveRequest>;
  cancelRequest(requestId: string, employeeId: string): Promise<LeaveRequest>;
  getRequestById(id: string): Promise<LeaveRequest | null>;
  getEmployeeRequests(employeeId: string): Promise<LeaveRequest[]>;
  getPendingForManager(managerId: string): Promise<LeaveRequest[]>;
}
