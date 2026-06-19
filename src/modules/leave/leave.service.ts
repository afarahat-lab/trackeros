import { LeaveRequestRepository } from './leave.repository';
import { LeaveBalanceRepository } from '../balance/balance.repository';
import { NotificationService } from '../notification/notification.service';
import { AuditLogService } from '../audit/audit.service';
import { CreateLeaveRequestDto } from './leave.dto';
import { SubmitLeaveRequestDto } from './leave.dto';
import { ReviewLeaveRequestDto } from './leave.dto';
import { CancelLeaveRequestDto } from './leave.dto';
import { LeaveRequest, LeaveRequestStatus } from './leave.model';

export interface LeaveRequestService {
  createDraft(dto: CreateLeaveRequestDto): Promise<LeaveRequest>;
  submitRequest(dto: SubmitLeaveRequestDto): Promise<LeaveRequest>;
  approveRequest(dto: ReviewLeaveRequestDto): Promise<LeaveRequest>;
  rejectRequest(dto: ReviewLeaveRequestDto): Promise<LeaveRequest>;
  cancelRequest(dto: CancelLeaveRequestDto): Promise<LeaveRequest>;
  getEmployeeRequests(employeeId: string, status?: LeaveRequestStatus): Promise<LeaveRequest[]>;
  getManagerPendingRequests(managerId: string): Promise<LeaveRequest[]>;
}

export class LeaveRequestServiceImpl implements LeaveRequestService {
  constructor(
    private readonly leaveRequestRepository: LeaveRequestRepository,
    private readonly leaveBalanceRepository: LeaveBalanceRepository,
    private readonly notificationService: NotificationService,
    private readonly auditLogService: AuditLogService
  ) {}

  async createDraft(dto: CreateLeaveRequestDto): Promise<LeaveRequest> {
    // Implementation will be added in Phase 3
    throw new Error('Not implemented');
  }

  async submitRequest(dto: SubmitLeaveRequestDto): Promise<LeaveRequest> {
    // Implementation will be added in Phase 3
    throw new Error('Not implemented');
  }

  async approveRequest(dto: ReviewLeaveRequestDto): Promise<LeaveRequest> {
    // Implementation will be added in Phase 3
    throw new Error('Not implemented');
  }

  async rejectRequest(dto: ReviewLeaveRequestDto): Promise<LeaveRequest> {
    // Implementation will be added in Phase 3
    throw new Error('Not implemented');
  }

  async cancelRequest(dto: CancelLeaveRequestDto): Promise<LeaveRequest> {
    // Implementation will be added in Phase 3
    throw new Error('Not implemented');
  }

  async getEmployeeRequests(employeeId: string, status?: LeaveRequestStatus): Promise<LeaveRequest[]> {
    // Implementation will be added in Phase 3
    throw new Error('Not implemented');
  }

  async getManagerPendingRequests(managerId: string): Promise<LeaveRequest[]> {
    // Implementation will be added in Phase 3
    throw new Error('Not implemented');
  }
}
