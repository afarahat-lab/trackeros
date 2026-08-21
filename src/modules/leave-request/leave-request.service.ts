import { LeaveStatus } from '../../shared/types';
import { IAuditLogRepository } from '../audit-log/audit-log.model';
import { IBalanceService } from '../balance/balance.model';
import { ILeavePolicyService } from '../leave-policy/leave-policy.model';
import { INotificationService } from '../notification/notification.model';
import {
  CreateLeaveRequestDto,
  createLeaveRequestSchema,
  ILeaveRequestRepository,
  ILeaveRequestService,
  LeaveRequest,
  LeaveRequestNotFoundError,
  LeaveRequestValidationError,
} from './leave-request.model';

function calculateDays(startDate: Date, endDate: Date): number {
  return (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24) + 1;
}

export class LeaveRequestService implements ILeaveRequestService {
  constructor(
    private readonly repository: ILeaveRequestRepository,
    private readonly policyService: ILeavePolicyService,
    private readonly balanceService: IBalanceService,
    private readonly notificationService: INotificationService,
    private readonly auditLogRepository: IAuditLogRepository,
  ) {}

  async submit(request: CreateLeaveRequestDto): Promise<LeaveRequest> {
    const parsed = createLeaveRequestSchema.safeParse(request);
    if (!parsed.success) {
      throw new LeaveRequestValidationError(
        parsed.error.issues.map((issue) => issue.message).join('; '),
      );
    }

    const { employeeId, leaveType, startDate, endDate, reason } = parsed.data;
    const days = calculateDays(startDate, endDate);

    await this.policyService.validateEntitlement(employeeId, leaveType, days);

    const hasBalance = await this.balanceService.hasSufficientBalance(
      employeeId,
      leaveType,
      days,
    );
    if (!hasBalance) {
      throw new LeaveRequestValidationError(
        `Insufficient balance for ${leaveType}: requested ${days} days`,
      );
    }

    const leaveRequest = await this.repository.create({
      employeeId,
      leaveType,
      startDate,
      endDate,
      reason,
      status: LeaveStatus.submitted,
      approvedBy: null,
      approvedAt: null,
      rejectionReason: undefined,
    });

    await this.notificationService.notifyLeaveSubmitted(leaveRequest);

    await this.auditLogRepository.create({
      entityType: 'leave_request',
      entityId: leaveRequest.id,
      action: 'submitted',
      performedBy: employeeId,
      changes: {
        employeeId,
        leaveType,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        days,
        reason: reason ?? null,
      },
    });

    return leaveRequest;
  }

  async approve(id: string, approverId: string): Promise<LeaveRequest> {
    const existing = await this.repository.findById(id);
    if (existing === null) {
      throw new LeaveRequestNotFoundError(`Leave request not found: ${id}`);
    }

    if (existing.status !== LeaveStatus.submitted) {
      throw new LeaveRequestValidationError(
        `Cannot approve a leave request with status '${existing.status}'. Only 'submitted' requests can be approved.`,
      );
    }

    const days = calculateDays(existing.startDate, existing.endDate);

    const updated = await this.repository.updateStatus(
      id,
      LeaveStatus.approved,
      approverId,
    );
    if (updated === null) {
      throw new LeaveRequestNotFoundError(`Leave request not found: ${id}`);
    }

    await this.balanceService.deductBalance(
      existing.employeeId,
      existing.leaveType,
      days,
    );

    await this.notificationService.notifyLeaveApproved(updated);

    await this.auditLogRepository.create({
      entityType: 'leave_request',
      entityId: updated.id,
      action: 'approved',
      performedBy: approverId,
      changes: {
        approvedBy: approverId,
        approvedAt: updated.approvedAt?.toISOString() ?? null,
        days,
      },
    });

    return updated;
  }

  async reject(
    id: string,
    approverId: string,
    reason: string,
  ): Promise<LeaveRequest> {
    if (!reason || reason.trim().length === 0) {
      throw new LeaveRequestValidationError(
        'Rejection reason is required.',
      );
    }

    const existing = await this.repository.findById(id);
    if (existing === null) {
      throw new LeaveRequestNotFoundError(`Leave request not found: ${id}`);
    }

    if (existing.status !== LeaveStatus.submitted) {
      throw new LeaveRequestValidationError(
        `Cannot reject a leave request with status '${existing.status}'. Only 'submitted' requests can be rejected.`,
      );
    }

    const updated = await this.repository.updateStatus(
      id,
      LeaveStatus.rejected,
      undefined,
      reason,
    );
    if (updated === null) {
      throw new LeaveRequestNotFoundError(`Leave request not found: ${id}`);
    }

    await this.notificationService.notifyLeaveRejected(updated);

    await this.auditLogRepository.create({
      entityType: 'leave_request',
      entityId: updated.id,
      action: 'rejected',
      performedBy: approverId,
      changes: {
        rejectedBy: approverId,
        rejectionReason: reason,
      },
    });

    return updated;
  }

  async cancel(id: string, employeeId: string): Promise<LeaveRequest> {
    const existing = await this.repository.findById(id);
    if (existing === null) {
      throw new LeaveRequestNotFoundError(`Leave request not found: ${id}`);
    }

    if (
      existing.status !== LeaveStatus.submitted &&
      existing.status !== LeaveStatus.approved
    ) {
      throw new LeaveRequestValidationError(
        `Cannot cancel a leave request with status '${existing.status}'. Only 'submitted' or 'approved' requests can be cancelled.`,
      );
    }

    if (existing.employeeId !== employeeId) {
      throw new LeaveRequestValidationError(
        'Only the request owner can cancel their own leave request.',
      );
    }

    const updated = await this.repository.updateStatus(
      id,
      LeaveStatus.cancelled,
    );
    if (updated === null) {
      throw new LeaveRequestNotFoundError(`Leave request not found: ${id}`);
    }

    await this.notificationService.notifyLeaveCancelled(updated);

    await this.auditLogRepository.create({
      entityType: 'leave_request',
      entityId: updated.id,
      action: 'cancelled',
      performedBy: employeeId,
      changes: {
        cancelledBy: employeeId,
        previousStatus: existing.status,
      },
    });

    return updated;
  }

  async getById(id: string): Promise<LeaveRequest | null> {
    return this.repository.findById(id);
  }

  async getByEmployee(employeeId: string): Promise<LeaveRequest[]> {
    return this.repository.findByEmployeeId(employeeId);
  }

  async getPendingForManager(managerId: string): Promise<LeaveRequest[]> {
    return this.repository.findByManagerId(managerId);
  }
}
