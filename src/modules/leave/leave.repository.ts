import { LeaveRequest, CreateLeaveRequestDto, LeaveRequestQueryParams } from './leave.model';
import { LeaveRequestStatus } from '../../shared/types/leave.types';

export interface ILeaveRepository {
  findByEmployeeId(employeeId: string, params?: LeaveRequestQueryParams): Promise<LeaveRequest[]>;
  findById(id: string): Promise<LeaveRequest | null>;
  create(dto: CreateLeaveRequestDto): Promise<LeaveRequest>;
  updateStatus(
    id: string,
    status: LeaveRequestStatus,
    metadata: Partial<Pick<LeaveRequest, 'approvedBy' | 'approvedAt' | 'rejectedBy' | 'rejectedAt' | 'rejectionReason' | 'cancelledBy' | 'cancelledAt' | 'cancellationReason'>>,
  ): Promise<LeaveRequest | null>;
  findAll(params?: LeaveRequestQueryParams): Promise<LeaveRequest[]>;
}
