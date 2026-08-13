import { LeaveStatus } from '../../shared/types';
import { LeaveRequest } from './leave-request.model';

export interface CreateLeaveRequestDto {
  employeeId: string;
  leaveTypeId: string;
  startDate: Date;
  endDate: Date;
  reason?: string;
  status?: LeaveStatus;
}

export interface StatusUpdateMetadata {
  approvedBy?: string | null;
  approvedAt?: Date | null;
  rejectedBy?: string | null;
  rejectedAt?: Date | null;
  rejectionReason?: string | null;
}

export interface UpdateLeaveRequestDto {
  startDate?: Date;
  endDate?: Date;
  reason?: string;
  status?: LeaveStatus;
  approvedBy?: string | null;
  approvedAt?: Date | null;
  rejectedBy?: string | null;
  rejectedAt?: Date | null;
  rejectionReason?: string | null;
}

export interface ILeaveRequestRepository {
  findById(id: string): Promise<LeaveRequest | null>;
  findByEmployeeId(employeeId: string): Promise<LeaveRequest[]>;
  findOverlapping(
    employeeId: string,
    startDate: Date,
    endDate: Date,
    excludeStatuses: LeaveStatus[],
  ): Promise<LeaveRequest[]>;
  create(dto: CreateLeaveRequestDto): Promise<LeaveRequest>;
  updateStatus(
    id: string,
    status: LeaveStatus,
    metadata: StatusUpdateMetadata,
  ): Promise<LeaveRequest | null>;
  findByStatus(status: LeaveStatus): Promise<LeaveRequest[]>;
}
