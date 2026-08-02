import type { LeaveRequest } from './leave.model';
import type { CreateLeaveRequestDto } from '../../shared/types/leave-request.dto';

export type ActorRole = 'employee' | 'manager' | 'hr_admin';

export interface ILeaveRequestService {
  submitDraft(leaveRequestId: string, actorId: string): Promise<LeaveRequest>;
  approve(leaveRequestId: string, approverId: string, approverRole: ActorRole): Promise<LeaveRequest>;
  reject(leaveRequestId: string, rejectorId: string, rejectorRole: ActorRole, reason: string): Promise<LeaveRequest>;
  cancel(leaveRequestId: string, actorId: string): Promise<LeaveRequest>;
  createDraft(dto: CreateLeaveRequestDto): Promise<LeaveRequest>;
  findById(id: string): Promise<LeaveRequest | null>;
  findByEmployee(employeeId: string): Promise<LeaveRequest[]>;
}
