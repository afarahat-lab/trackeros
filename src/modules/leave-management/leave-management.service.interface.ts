import { LeaveRequest, CreateLeaveRequestDto } from '../leave/leave.model';
import { LeaveBalance } from '../balance/balance.model';

export interface ILeaveManagementService {
  applyForLeave(dto: CreateLeaveRequestDto): Promise<LeaveRequest>;
  approveLeave(leaveId: string, approverId: string, comment?: string): Promise<LeaveRequest>;
  rejectLeave(leaveId: string, approverId: string, comment: string): Promise<LeaveRequest>;
  cancelLeave(leaveId: string, employeeId: string): Promise<LeaveRequest>;
  discardDraft(leaveId: string, employeeId: string): Promise<void>;
  getLeaveBalance(employeeId: string, leaveTypeId: string, year: number): Promise<LeaveBalance>;
  getLeaveHistory(employeeId: string): Promise<LeaveRequest[]>;
}
