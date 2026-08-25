import { LeaveStatus } from 'shared/types';
import { LeaveRequest, LeaveRequestQueryParams } from './leave.model';

export interface ILeaveRequestRepository {
  findById(id: string): Promise<LeaveRequest | null>;
  findByEmployee(employeeId: string, queryParams?: LeaveRequestQueryParams): Promise<LeaveRequest[]>;
  findApprovedOverlapping(employeeId: string, startDate: Date, endDate: Date, excludeRequestId?: string): Promise<LeaveRequest[]>;
  create(request: Omit<LeaveRequest, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeaveRequest>;
  update(id: string, data: Partial<LeaveRequest>): Promise<LeaveRequest>;
  updateStatus(id: string, status: LeaveStatus, approvedBy?: string | null, approvedAt?: Date | null): Promise<LeaveRequest>;
}
