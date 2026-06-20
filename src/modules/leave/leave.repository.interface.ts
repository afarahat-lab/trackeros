import { LeaveRequest, LeaveStatus as LeaveRequestStatus } from '../../shared/types/index';

export interface CreateLeaveRequestDTO {
  employeeId: string;
  leaveTypeId: string;
  startDate: Date;
  endDate: Date;
  reason?: string;
}

export interface ILeaveRequestRepository {
  create(data: CreateLeaveRequestDTO): Promise<LeaveRequest>;
  findById(id: string): Promise<LeaveRequest | null>;
  findByEmployeeId(employeeId: string): Promise<LeaveRequest[]>;
  findByManagerId(managerId: string): Promise<LeaveRequest[]>;
  updateStatus(id: string, status: LeaveRequestStatus, approvedBy?: string | null, approvedAt?: Date | null): Promise<LeaveRequest>;
}
