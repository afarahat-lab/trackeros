import { LeaveRequest } from './leave-request.model';

export interface CreateLeaveRequestInput {
  leaveTypeId: string;
  startDate: Date;
  endDate: Date;
  reason?: string;
}

export interface ILeaveRequestService {
  createDraft(
    employeeId: string,
    dto: CreateLeaveRequestInput,
  ): Promise<LeaveRequest>;

  submit(id: string, employeeId: string): Promise<LeaveRequest>;

  approve(id: string, managerId: string): Promise<LeaveRequest>;

  reject(
    id: string,
    managerId: string,
    reason: string,
  ): Promise<LeaveRequest>;

  cancel(id: string, employeeId: string): Promise<LeaveRequest>;

  getById(id: string): Promise<LeaveRequest>;

  getByEmployee(employeeId: string): Promise<LeaveRequest[]>;
}
