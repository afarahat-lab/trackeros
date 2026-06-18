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
    // 1. Validate policy
    const policyValid = await this.policyService.validateLeavePolicy(
      dto.employeeId,
      dto.leaveType,
      dto.startDate,
      dto.endDate
    );
    if (!policyValid) {
      throw new Error('Leave request does not comply with company policy');
    }

    // 2. Check balance
    const days = this.calculateDays(dto.startDate, dto.endDate);
    const hasBalance = await this.balanceService.checkLeaveBalance(
      dto.employeeId,
      dto.leaveType,
      days
    );
    if (!hasBalance) {
      throw new Error('Insufficient leave balance');
    }

    // 3. Create the request in draft status
    const leaveRequest = await this.leaveRepository.create(dto);
    leaveRequest.requestStatus = LeaveRequestStatus.Draft;

    // 4. Audit log
    this.auditLogger.log('LEAVE_REQUEST_CREATED', {
      leaveRequestId: leaveRequest.id,
      employeeId: dto.employeeId,
      leaveType: dto.leaveType,
    });

    // 5. Publish event
    this.eventPublisher.publish('leave.created', {
      leaveRequestId: leaveRequest.id,
      employeeId: dto.employeeId,
    });

    return leaveRequest;
  }

  async submitLeaveRequest(id: string): Promise<LeaveRequest> {
    const existing = await this.leaveRepository.findById(id);
    if (!existing) {
      throw new Error('Leave request not found');
    }

    if (existing.requestStatus !== LeaveRequestStatus.Draft) {
      throw new Error('Only draft leave requests can be submitted');
    }

    // Transition to pending approval
    existing.requestStatus = LeaveRequestStatus.PendingApproval;
    existing.status = 'pending' as any; // keep legacy status in sync
    existing.updatedAt = new Date();

    const updated = await this.leaveRepository.update(id, {
      employeeId: existing.employeeId,
      leaveType: existing.leaveType,
      startDate: existing.startDate,
      endDate: existing.endDate,
      reason: existing.reason,
      managerId: existing.managerId,
    });

    if (!updated) {
      throw new Error('Failed to update leave request');
    }

    // Ensure the returned object has the correct status
    updated.requestStatus = LeaveRequestStatus.PendingApproval;
    updated.status = 'pending' as any;

    this.auditLogger.log('LEAVE_REQUEST_SUBMITTED', {
      leaveRequestId: updated.id,
      employeeId: updated.employeeId,
    });

    this.eventPublisher.publish('leave.submitted', {
      leaveRequestId: updated.id,
      employeeId: updated.employeeId,
    });

    return updated;
  }

  async cancelLeaveRequest(id: string): Promise<LeaveRequest> {
    const existing = await this.leaveRepository.findById(id);
    if (!existing) {
      throw new Error('Leave request not found');
    }

    const allowedStatuses: LeaveRequestStatus[] = [
      LeaveRequestStatus.Draft,
      LeaveRequestStatus.PendingApproval,
    ];

    if (!allowedStatuses.includes(existing.requestStatus!)) {
      throw new Error('Leave request cannot be cancelled in its current status');
    }

    existing.requestStatus = LeaveRequestStatus.Cancelled;
    existing.status = 'rejected' as any; // legacy status mapping
    existing.updatedAt = new Date();

    const updated = await this.leaveRepository.update(id, {
      employeeId: existing.employeeId,
      leaveType: existing.leaveType,
      startDate: existing.startDate,
      endDate: existing.endDate,
      reason: existing.reason,
      managerId: existing.managerId,
    });

    if (!updated) {
      throw new Error('Failed to update leave request');
    }

    updated.requestStatus = LeaveRequestStatus.Cancelled;
    updated.status = 'rejected' as any;

    this.auditLogger.log('LEAVE_REQUEST_CANCELLED', {
      leaveRequestId: updated.id,
      employeeId: updated.employeeId,
    });

    this.eventPublisher.publish('leave.cancelled', {
      leaveRequestId: updated.id,
      employeeId: updated.employeeId,
    });

    return updated;
  }

  async getLeaveRequestById(id: string): Promise<LeaveRequest | null> {
    return this.leaveRepository.findById(id);
  }

  async getLeaveRequestsByEmployee(employeeId: string, status?: LeaveRequestStatus): Promise<LeaveRequest[]> {
    return this.leaveRepository.findByEmployeeId(employeeId, status);
  }

  private calculateDays(start: Date, end: Date): number {
    const msPerDay = 1000 * 60 * 60 * 24;
    const diff = end.getTime() - start.getTime();
    return Math.ceil(diff / msPerDay) + 1; // inclusive of both start and end dates
  }
}
