import { LeaveRequest, CreateLeaveRequestDto } from './leave.model';
import { LeaveRequestStatus } from '../../shared/types';
import { ILeaveRepository } from './leave.repository';
import { PolicyService } from '../policy/policy.service';
import { BalanceService } from '../balance/balance.service';
import { AuditLogger } from '../../shared/audit/audit.logger';
import { EventPublisher } from '../../shared/events/event.publisher';

export interface ILeaveApplicationService {
  createLeaveRequest(employeeId: string, dto: CreateLeaveRequestDto): Promise<LeaveRequest>;
  submitLeaveRequest(employeeId: string, leaveRequestId: string): Promise<LeaveRequest>;
  cancelLeaveRequest(employeeId: string, leaveRequestId: string): Promise<LeaveRequest>;
  getLeaveRequestById(leaveRequestId: string): Promise<LeaveRequest | null>;
  getLeaveRequestsByEmployee(employeeId: string, status?: LeaveRequestStatus): Promise<LeaveRequest[]>;
}

export class LeaveApplicationService implements ILeaveApplicationService {
  constructor(
    private readonly leaveRepository: ILeaveRepository,
    private readonly policyService: PolicyService,
    private readonly balanceService: BalanceService,
    private readonly auditLogger: AuditLogger,
    private readonly eventPublisher: EventPublisher
  ) {}

  async createLeaveRequest(employeeId: string, dto: CreateLeaveRequestDto): Promise<LeaveRequest> {
    throw new Error('Method not implemented');
  }

  async submitLeaveRequest(employeeId: string, leaveRequestId: string): Promise<LeaveRequest> {
    throw new Error('Method not implemented');
  }

  async cancelLeaveRequest(employeeId: string, leaveRequestId: string): Promise<LeaveRequest> {
    throw new Error('Method not implemented');
  }

  async getLeaveRequestById(leaveRequestId: string): Promise<LeaveRequest | null> {
    return this.leaveRepository.findById(leaveRequestId);
  }

  async getLeaveRequestsByEmployee(employeeId: string, status?: LeaveRequestStatus): Promise<LeaveRequest[]> {
    return this.leaveRepository.findByEmployeeId(employeeId, status);
  }
}
