import { LeaveRequest, CreateLeaveRequestDto } from './leave.model';
import { LeaveStatus } from '../../shared/types/leave.types';

export interface ILeaveService {
  createLeaveRequest(dto: CreateLeaveRequestDto): Promise<LeaveRequest>;
  approveLeave(id: string, approverId: string): Promise<LeaveRequest>;
  rejectLeave(id: string, rejecterId: string, reason: string): Promise<LeaveRequest>;
  cancelLeave(id: string, cancellerId: string, reason: string): Promise<LeaveRequest>;
  getLeaveRequestById(id: string): Promise<LeaveRequest | null>;
  getLeaveRequestsByEmployee(employeeId: string): Promise<LeaveRequest[]>;
  getLeaveRequestsByStatus(status: LeaveStatus): Promise<LeaveRequest[]>;
}
