import { LeaveRequest, CreateLeaveRequestDto } from './leave.model';
import { LeaveRequestStatus } from '../../shared/types';
import { ILeaveRepository } from './leave.repository';
import { PolicyService } from '../policy/policy.service';
import { BalanceService } from '../balance/balance.service';
import { AuditLogger } from '../../shared/audit/audit.logger';
import { EventPublisher } from '../../shared/events/event.publisher';

export interface ILeaveApplicationService {
  createLeaveRequest(dto: CreateLeaveRequestDto): Promise<LeaveRequest>;
  submitLeaveRequest(id: string): Promise<LeaveRequest>;
  cancelLeaveRequest(id: string): Promise<LeaveRequest>;
  getLeaveRequestById(id: string): Promise<LeaveRequest | null>;
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

  async createLeaveRequest(dto: CreateLeaveRequestDto): Promise<LeaveRequest> {
    throw new Error('Method not implemented');
  }

  async submitLeaveRequest(id: string): Promise<LeaveRequest> {
    throw new Error('Method not implemented');
  }

  async cancelLeaveRequest(id: string): Promise<LeaveRequest> {
    throw new Error('Method not implemented');
  }

  async getLeaveRequestById(id: string): Promise<LeaveRequest | null> {
    return this.leaveRepository.findById(id);
  }

  async getLeaveRequestsByEmployee(employeeId: string, status?: LeaveRequestStatus): Promise<LeaveRequest[]> {
    return this.leaveRepository.findByEmployeeId(employeeId, status);
  }
}
