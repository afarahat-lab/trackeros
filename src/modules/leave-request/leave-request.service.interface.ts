import { LeaveRequest } from './leave-request.model';
import { CreateLeaveRequestDto, LeaveRequestQueryParams } from '../../shared/types';

export interface ILeaveRequestService {
  createDraft(dto: CreateLeaveRequestDto): Promise<LeaveRequest>;
  submit(id: string): Promise<LeaveRequest>;
  approve(id: string, approverId: string): Promise<LeaveRequest>;
  reject(id: string, approverId: string): Promise<LeaveRequest>;
  cancel(id: string): Promise<LeaveRequest>;
  findById(id: string): Promise<LeaveRequest | null>;
  findByEmployeeId(employeeId: string): Promise<LeaveRequest[]>;
  query(params: LeaveRequestQueryParams): Promise<LeaveRequest[]>;
}
