import { LeaveRequest, CreateLeaveRequestDto, UpdateLeaveRequestDto, LeaveRequestQueryParams } from './leave.model';

export interface ILeaveRepository {
  create(dto: CreateLeaveRequestDto): Promise<LeaveRequest>;
  findById(id: string): Promise<LeaveRequest | null>;
  findByEmployeeId(employeeId: string): Promise<LeaveRequest[]>;
  findByQuery(params: LeaveRequestQueryParams): Promise<LeaveRequest[]>;
  updateStatus(id: string, status: LeaveRequest['status'], decidedAt?: Date, decisionComment?: string): Promise<LeaveRequest>;
  update(id: string, dto: UpdateLeaveRequestDto): Promise<LeaveRequest>;
  delete(id: string): Promise<void>;
}
