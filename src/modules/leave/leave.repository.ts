import { LeaveRequest, CreateLeaveRequestDto } from './leave.model';

export interface ILeaveRepository {
  create(dto: CreateLeaveRequestDto): Promise<LeaveRequest>;
  findById(id: string): Promise<LeaveRequest | null>;
  findByEmployeeId(employeeId: string): Promise<LeaveRequest[]>;
  updateStatus(id: string, status: LeaveRequest['status'], reviewerComments?: string): Promise<LeaveRequest>;
  update(id: string, updates: Partial<LeaveRequest>): Promise<LeaveRequest>;
  delete(id: string): Promise<void>;
}
