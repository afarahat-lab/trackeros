import { LeaveRequest } from './leave.model';
import { LeaveStatus } from '../../shared/types';

export interface ILeaveRepository {
  create(request: Omit<LeaveRequest, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeaveRequest>;
  findById(id: number): Promise<LeaveRequest | null>;
  findByEmployeeId(employeeId: number): Promise<LeaveRequest[]>;
  updateStatus(id: number, status: LeaveStatus): Promise<LeaveRequest | null>;
  delete(id: number): Promise<boolean>;
}
