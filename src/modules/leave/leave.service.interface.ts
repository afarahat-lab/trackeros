import { LeaveRequest, CreateLeaveRequestDto, LeaveRequestQueryParams } from './leave.model';

export interface ILeaveService {
  submit(dto: CreateLeaveRequestDto): Promise<LeaveRequest>;
  approve(requestId: string, approverId: string): Promise<LeaveRequest>;
  reject(requestId: string, rejectorId: string): Promise<LeaveRequest>;
  cancel(requestId: string, employeeId: string): Promise<LeaveRequest>;
  getById(requestId: string): Promise<LeaveRequest | null>;
  query(params: LeaveRequestQueryParams): Promise<LeaveRequest[]>;
}
