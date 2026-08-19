import { LeaveRequest, LeaveRequestQueryParams } from './leave.model';
import { LeaveRequestStatus } from '../../shared/types/index';

export interface ILeaveRequestRepository {
  findById(id: string): Promise<LeaveRequest | null>;
  findByEmployee(employeeId: string): Promise<LeaveRequest[]>;
  findByStatus(status: LeaveRequestStatus): Promise<LeaveRequest[]>;
  findByDateRange(start: Date, end: Date): Promise<LeaveRequest[]>;
  query(params: LeaveRequestQueryParams): Promise<LeaveRequest[]>;
  create(request: Omit<LeaveRequest, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeaveRequest>;
  update(id: string, data: Partial<LeaveRequest>): Promise<LeaveRequest | null>;
  delete(id: string): Promise<boolean>;
}
