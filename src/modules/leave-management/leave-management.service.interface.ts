import { LeaveRequest, CreateLeaveRequestDto } from '../leave/leave.model';
import { LeaveBalance } from '../balance/balance.model';

export interface UserContext {
  id: string;
  role: string;
}

export interface LeaveRequestFilters {
  employeeId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

export interface ILeaveManagementService {
  createLeaveRequest(dto: CreateLeaveRequestDto, user: UserContext): Promise<LeaveRequest>;
  submitLeaveRequest(id: string, user: UserContext): Promise<LeaveRequest>;
  approveLeaveRequest(id: string, user: UserContext, comment?: string): Promise<LeaveRequest>;
  rejectLeaveRequest(id: string, user: UserContext, comment: string): Promise<LeaveRequest>;
  cancelLeaveRequest(id: string, user: UserContext): Promise<LeaveRequest>;
  discardDraftLeaveRequest(id: string, user: UserContext): Promise<void>;
  getLeaveBalance(employeeId: string, user: UserContext): Promise<LeaveBalance[]>;
  getLeaveHistory(filters: LeaveRequestFilters, user: UserContext): Promise<LeaveRequest[]>;
}
