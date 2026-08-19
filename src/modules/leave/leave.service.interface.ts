import { LeaveRequest, CreateLeaveRequestDto, LeaveRequestQueryParams } from './leave.model';

export interface ILeaveService {
  create(data: CreateLeaveRequestDto): Promise<LeaveRequest>;
  submit(id: string): Promise<LeaveRequest>;
  approve(id: string, approverId: string): Promise<LeaveRequest>;
  reject(id: string, rejectorId: string, reason: string): Promise<LeaveRequest>;
  cancel(id: string, cancelledBy: string, reason: string): Promise<LeaveRequest>;
  getById(id: string): Promise<LeaveRequest | null>;
  getByEmployee(employeeId: string): Promise<LeaveRequest[]>;
  query(params: LeaveRequestQueryParams): Promise<LeaveRequest[]>;
}
