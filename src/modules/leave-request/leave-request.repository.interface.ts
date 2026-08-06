
import { LeaveRequest } from './leave-request.model';
import { LeaveRequestStatus } from '../../shared/types';

export interface LeaveRequestFilters {
  employeeId?: string;
  status?: LeaveRequestStatus;
  leaveTypeId?: string;
  startDateFrom?: Date;
  startDateTo?: Date;
}

export interface LeaveRequestStatusMetadata {
  approvedBy?: string | null;
  approvedAt?: Date | null;
  cancelledBy?: string | null;
  cancelledAt?: Date | null;
}

export interface ILeaveRequestRepository {
  findById(id: string): Promise<LeaveRequest | null>;
  findByEmployeeId(employeeId: string): Promise<LeaveRequest[]>;
  findByEmployeeAndStatus(employeeId: string, status: LeaveRequestStatus): Promise<LeaveRequest[]>;
  findOverlapping(employeeId: string, startDate: Date, endDate: Date): Promise<LeaveRequest[]>;
  findPendingByManagerId(managerId: string): Promise<LeaveRequest[]>;
  findAll(filters: LeaveRequestFilters): Promise<LeaveRequest[]>;
  create(request: Omit<LeaveRequest, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeaveRequest>;
  update(id: string, request: Partial<Omit<LeaveRequest, 'id' | 'createdAt' | 'updatedAt'>>): Promise<LeaveRequest | null>;
  updateStatus(id: string, status: LeaveRequestStatus, metadata: LeaveRequestStatusMetadata): Promise<LeaveRequest | null>;
}
