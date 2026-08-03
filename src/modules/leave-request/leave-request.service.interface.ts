import { LeaveRequest, CreateLeaveRequestDto } from './leave-request.model';

export interface ILeaveRequestService {
  submit(
    dto: CreateLeaveRequestDto,
    actorId: string,
    actorRole: 'employee' | 'manager' | 'hr_admin',
  ): Promise<LeaveRequest>;

  approve(
    leaveRequestId: string,
    approverId: string,
    approverRole: 'manager' | 'hr_admin',
  ): Promise<LeaveRequest>;

  reject(
    leaveRequestId: string,
    approverId: string,
    approverRole: 'manager' | 'hr_admin',
  ): Promise<LeaveRequest>;

  cancel(
    leaveRequestId: string,
    actorId: string,
    actorRole: 'employee' | 'manager' | 'hr_admin',
  ): Promise<LeaveRequest>;

  getById(leaveRequestId: string): Promise<LeaveRequest | null>;

  getByEmployee(employeeId: string): Promise<LeaveRequest[]>;
}
