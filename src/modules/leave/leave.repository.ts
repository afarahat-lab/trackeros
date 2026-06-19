import { LeaveRequest, CreateLeaveRequestDto, UpdateLeaveRequestDto, LeaveQueryParams } from './leave.model';

export interface ILeaveRepository {
  create(data: CreateLeaveRequestDto): Promise<LeaveRequest>;
  findById(id: string): Promise<LeaveRequest | null>;
  findByEmployeeId(employeeId: string): Promise<LeaveRequest[]>;
  findByManagerId(managerId: string): Promise<LeaveRequest[]>;
  updateStatus(id: string, status: LeaveRequest['status']): Promise<LeaveRequest>;
  update(id: string, updates: UpdateLeaveRequestDto): Promise<LeaveRequest>;
  delete(id: string): Promise<boolean>;
  findAll(query: LeaveQueryParams): Promise<{ data: LeaveRequest[]; total: number }>;
}
