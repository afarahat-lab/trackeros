import { ILeaveRepository } from './leave.repository';
import { ILeaveBalanceRepository } from '../balance/balance.repository';
import { ILeavePolicyRepository } from '../policy/policy.repository';
import { IEmployeeService } from '../employee/employee.service';
import { INotificationService } from '../notification/notification.service';
import { LeaveRequest, CreateLeaveRequestDto, UpdateLeaveRequestDto, LeaveRequestQueryParams } from './leave.model';
import { LeaveBalance } from '../balance/balance.model';
import { LeavePolicy } from '../policy/policy.model';
import { Employee } from '../employee/employee.model';
import { Notification } from '../notification/notification.model';

export interface ILeaveService {
  createLeaveRequest(dto: CreateLeaveRequestDto): Promise<LeaveRequest>;
  submitLeaveRequest(id: string, employeeId: string): Promise<LeaveRequest>;
  getLeaveRequestById(id: string): Promise<LeaveRequest | null>;
  getLeaveRequestsByEmployee(employeeId: string, query?: LeaveRequestQueryParams): Promise<LeaveRequest[]>;
  updateLeaveRequest(id: string, dto: UpdateLeaveRequestDto): Promise<LeaveRequest>;
  cancelLeaveRequest(id: string, employeeId: string): Promise<LeaveRequest>;
}

export class LeaveService implements ILeaveService {
  constructor(
    private readonly leaveRepository: ILeaveRepository,
    private readonly leaveBalanceRepository: ILeaveBalanceRepository,
    private readonly leavePolicyRepository: ILeavePolicyRepository,
    private readonly employeeService: IEmployeeService,
    private readonly notificationService: INotificationService
  ) {}

  async createLeaveRequest(dto: CreateLeaveRequestDto): Promise<LeaveRequest> {
    // Implementation will validate employee exists, policy exists, check balance, create in DRAFT status
    throw new Error('Not implemented');
  }

  async submitLeaveRequest(id: string, employeeId: string): Promise<LeaveRequest> {
    // Implementation will transition from DRAFT to SUBMITTED, create audit log, send notification to manager
    throw new Error('Not implemented');
  }

  async getLeaveRequestById(id: string): Promise<LeaveRequest | null> {
    return this.leaveRepository.findById(id);
  }

  async getLeaveRequestsByEmployee(employeeId: string, query?: LeaveRequestQueryParams): Promise<LeaveRequest[]> {
    // ILeaveRepository.findByEmployeeId currently only accepts employeeId. Query filtering is deferred.
    return this.leaveRepository.findByEmployeeId(employeeId);
  }

  async updateLeaveRequest(id: string, dto: UpdateLeaveRequestDto): Promise<LeaveRequest> {
    // Implementation will validate only DRAFT requests can be updated, update fields, create audit log
    throw new Error('Not implemented');
  }

  async cancelLeaveRequest(id: string, employeeId: string): Promise<LeaveRequest> {
    // Implementation will transition to CANCELLED, create audit log, send notification
    throw new Error('Not implemented');
  }
}
