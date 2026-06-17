import { LeaveRequest, CreateLeaveRequestDto, UpdateLeaveRequestDto, LeaveRequestQuery } from './leave.model';

export interface ILeaveRepository {
  create(dto: CreateLeaveRequestDto): Promise<LeaveRequest>;
  findById(id: string): Promise<LeaveRequest | null>;
  findByEmployeeId(employeeId: string): Promise<LeaveRequest[]>;
  findByQuery(query: LeaveRequestQuery): Promise<LeaveRequest[]>;
  updateStatus(id: string, status: LeaveRequest['status'], reviewedBy?: string, reviewNotes?: string): Promise<LeaveRequest>;
  update(id: string, updates: UpdateLeaveRequestDto): Promise<LeaveRequest>;
  delete(id: string): Promise<void>;
}
