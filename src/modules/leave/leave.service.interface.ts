import { LeaveRequest } from './leave.model';

export type UserRole = 'employee' | 'manager' | 'hr_admin';

export interface CreateLeaveRequestDto {
  employeeId: string;
  leavePolicyId: string;
  startDate: Date;
  endDate: Date;
  reason?: string;
}

export interface ILeaveService {
  submitDraft(requestId: string, employeeId: string): Promise<LeaveRequest>;
  createDraft(dto: CreateLeaveRequestDto): Promise<LeaveRequest>;
  approve(requestId: string, approverId: string, approverRole: UserRole): Promise<LeaveRequest>;
  reject(requestId: string, approverId: string, approverRole: UserRole): Promise<LeaveRequest>;
  cancel(requestId: string, employeeId: string): Promise<LeaveRequest>;
  getById(requestId: string): Promise<LeaveRequest | null>;
  getByEmployee(employeeId: string): Promise<LeaveRequest[]>;
}
