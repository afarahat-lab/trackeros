import { CreateLeaveRequestDto, LeaveRequest, LeaveRequestQuery, LeaveRequestStatus } from './leave.model';
import { ILeaveRepository } from './leave.repository';
import { ILeaveBalanceRepository } from '../balance/balance.repository';
import { ILeavePolicyRepository } from '../policy/policy.repository';
import { IEmployeeRepository } from '../employee/employee.repository';
import { IAuditLogRepository } from '../../shared/audit/audit.repository';
import { INotificationRepository } from '../../shared/notification/notification.repository';

export interface ILeaveService {
  createLeaveRequest(dto: CreateLeaveRequestDto): Promise<LeaveRequest>;
  getLeaveRequestById(id: string): Promise<LeaveRequest | null>;
  getLeaveRequestsByEmployee(employeeId: string, query?: LeaveRequestQuery): Promise<LeaveRequest[]>;
  updateLeaveRequestStatus(id: string, status: LeaveRequestStatus, reviewedBy: string, reviewNotes?: string): Promise<LeaveRequest>;
  cancelLeaveRequest(id: string, employeeId: string): Promise<LeaveRequest>;
}

export class LeaveService implements ILeaveService {
  constructor(
    private readonly leaveRepository: ILeaveRepository,
    private readonly leaveBalanceRepository: ILeaveBalanceRepository,
    private readonly leavePolicyRepository: ILeavePolicyRepository,
    private readonly employeeRepository: IEmployeeRepository,
    private readonly auditLogRepository: IAuditLogRepository,
    private readonly notificationRepository: INotificationRepository
  ) {}

  async createLeaveRequest(dto: CreateLeaveRequestDto): Promise<LeaveRequest> {
    throw new Error('Not implemented');
  }

  async getLeaveRequestById(id: string): Promise<LeaveRequest | null> {
    throw new Error('Not implemented');
  }

  async getLeaveRequestsByEmployee(employeeId: string, query?: LeaveRequestQuery): Promise<LeaveRequest[]> {
    throw new Error('Not implemented');
  }

  async updateLeaveRequestStatus(id: string, status: LeaveRequestStatus, reviewedBy: string, reviewNotes?: string): Promise<LeaveRequest> {
    throw new Error('Not implemented');
  }

  async cancelLeaveRequest(id: string, employeeId: string): Promise<LeaveRequest> {
    throw new Error('Not implemented');
  }
}
