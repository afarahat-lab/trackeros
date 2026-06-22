import { LeaveRequest, CreateLeaveRequestDto } from '../leave/leave.model';
import { LeaveBalance } from '../balance/balance.model';

export interface UserContext {
  id: string;
  role: string;
}

export interface LeaveRequestFilters {
  employeeId?: string;
  status?: string;
  year?: number;
}

export interface ILeaveManagementService {
  submitLeaveRequest(dto: CreateLeaveRequestDto, user: UserContext): Promise<LeaveRequest>;
  approveLeaveRequest(leaveId: string, comment: string | undefined, user: UserContext): Promise<LeaveRequest>;
  rejectLeaveRequest(leaveId: string, comment: string, user: UserContext): Promise<LeaveRequest>;
  cancelLeaveRequest(leaveId: string, user: UserContext): Promise<LeaveRequest>;
  discardDraftLeaveRequest(leaveId: string, user: UserContext): Promise<void>;
  getLeaveBalance(employeeId: string, user: UserContext): Promise<LeaveBalance[]>;
  getLeaveHistory(filters: LeaveRequestFilters, user: UserContext): Promise<LeaveRequest[]>;
  getLeaveRequestById(id: string, user: UserContext): Promise<LeaveRequest>;
}
