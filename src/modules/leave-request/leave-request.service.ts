import { LeaveRequest } from './leave-request.model';
import { ILeaveRequestRepository } from './leave-request.repository';
import { ILeaveRequestService } from './leave-request.service.interface';
import { ILeaveBalanceService } from '../leave-balance';
import { IEmployeeService } from '../employee';
import { ILeavePolicyService } from '../leave-policy';
import { IAuditRepository } from '../audit';
import { INotificationService } from '../notification';
import { LeaveStatus, AuditAction, LeaveRequestDTO } from '../../shared/types/index';
import { countBusinessDays, DEFAULT_HOLIDAYS } from '../../shared/utils/business-day';

export class InvalidStateTransitionError extends Error {
  constructor(requestId: string, currentStatus: LeaveStatus, targetStatus: LeaveStatus) {
    super(
      `Invalid state transition for request ${requestId}: cannot transition from ${currentStatus} to ${targetStatus}`,
    );
    this.name = 'InvalidStateTransitionError';
  }
}

export class UnauthorizedApproverError extends Error {
  constructor(approverId: string, requestId: string) {
    super(
      `Approver ${approverId} is not authorized to act on request ${requestId}`,
    );
    this.name = 'UnauthorizedApproverError';
  }
}

export class RequestOwnershipError extends Error {
  constructor(employeeId: string, requestId: string) {
    super(
      `Employee ${employeeId} does not own request ${requestId}`,
    );
    this.name = 'RequestOwnershipError';
  }
}

function toLeaveRequestDTO(request: LeaveRequest): LeaveRequestDTO {
  return {
    id: request.id,
    employeeId: request.employeeId,
    leaveTypeId: request.leaveTypeId,
    startDate: request.startDate.toISOString(),
    endDate: request.endDate.toISOString(),
    reason: request.reason,
    rejectionReason: request.rejectionReason,
    status: request.status,
    approvedBy: request.approvedBy,
    approvedAt: request.approvedAt?.toISOString() ?? null,
    cancelledAt: request.cancelledAt?.toISOString() ?? null,
    createdAt: request.createdAt.toISOString(),
    updatedAt: request.updatedAt.toISOString(),
  };
}

export class LeaveRequestService implements ILeaveRequestService {
  constructor(
    private readonly requestRepo: ILeaveRequestRepository,
    private readonly balanceService: ILeaveBalanceService,
    private readonly employeeService: IEmployeeService,
    private readonly policyService: ILeavePolicyService,
    private readonly auditRepo: IAuditRepository,
    private readonly notificationService: INotificationService,
  ) {}

  async submitDraft(requestId: string, employeeId: string): Promise<LeaveRequest> {
    const request = await this.requestRepo.findById(requestId);
    if (!request) {
      throw new Error(`Leave request not found: ${requestId}`);
    }

    if (request.employeeId !== employeeId) {
      throw new RequestOwnershipError(employeeId, requestId);
    }

    if (request.status !== LeaveStatus.DRAFT) {
      throw new InvalidStateTransitionError(requestId, request.status, LeaveStatus.SUBMITTED);
    }

    const policy = await this.policyService.getActivePolicy(request.leaveTypeId);
    if (!policy) {
      throw new Error(`No active policy found for leave type: ${request.leaveTypeId}`);
    }

    const businessDays = countBusinessDays(request.startDate, request.endDate, DEFAULT_HOLIDAYS);
    if (businessDays <= 0) {
      throw new Error(`Request ${requestId} has zero or negative business days`);
    }

    const fiscalYear = request.startDate.getFullYear();

    let balance = await this.balanceService.getBalance(employeeId, request.leaveTypeId, fiscalYear);
    if (!balance) {
      balance = await this.balanceService.initializeBalance(employeeId, request.leaveTypeId, fiscalYear);
    }

    await this.balanceService.deductDays(employeeId, request.leaveTypeId, fiscalYear, businessDays);

    const employee = await this.employeeService.getEmployeeById(employeeId);
    if (!employee) {
      throw new Error(`Employee not found: ${employeeId}`);
    }

    if (employee.managerId === null) {
      console.log(
        `[LeaveRequest] Escalation: employee ${employeeId} has no manager. ` +
        `Request ${requestId} escalated to HR admin for approval.`,
      );
    }

    const updated = await this.requestRepo.updateStatus(requestId, LeaveStatus.SUBMITTED);
    if (!updated) {
      throw new Error(`Failed to update request status: ${requestId}`);
    }

    await this.auditRepo.create({
      entityType: 'leave_request',
      entityId: requestId,
      action: AuditAction.SUBMITTED,
      performedBy: employeeId,
      details: {
        leaveTypeId: request.leaveTypeId,
        businessDays,
        fiscalYear,
        escalatedToHr: employee.managerId === null,
      },
    });

    await this.notificationService.notifyLeaveSubmitted(toLeaveRequestDTO(updated));

    return updated;
  }

  async approveRequest(requestId: string, approverId: string): Promise<LeaveRequest> {
    const request = await this.requestRepo.findById(requestId);
    if (!request) {
      throw new Error(`Leave request not found: ${requestId}`);
    }

    if (request.status !== LeaveStatus.SUBMITTED) {
      throw new InvalidStateTransitionError(requestId, request.status, LeaveStatus.APPROVED);
    }

    const employee = await this.employeeService.getEmployeeById(request.employeeId);
    if (!employee) {
      throw new Error(`Employee not found: ${request.employeeId}`);
    }

    const isManager = employee.managerId === approverId;
    const isHrAdmin = employee.managerId === null && approverId !== request.employeeId;

    if (!isManager && !isHrAdmin) {
      throw new UnauthorizedApproverError(approverId, requestId);
    }

    const now = new Date();
    const updated = await this.requestRepo.updateStatus(requestId, LeaveStatus.APPROVED, {
      approvedBy: approverId,
      approvedAt: now,
    });
    if (!updated) {
      throw new Error(`Failed to update request status: ${requestId}`);
    }

    await this.auditRepo.create({
      entityType: 'leave_request',
      entityId: requestId,
      action: AuditAction.APPROVED,
      performedBy: approverId,
      details: {
        approvedBy: approverId,
        approvedAt: now.toISOString(),
      },
    });

    await this.notificationService.notifyLeaveApproved(toLeaveRequestDTO(updated));

    return updated;
  }

  async rejectRequest(
    requestId: string,
    approverId: string,
    rejectionReason: string,
  ): Promise<LeaveRequest> {
    if (!rejectionReason || rejectionReason.trim().length === 0) {
      throw new Error('Rejection reason is required');
    }

    const request = await this.requestRepo.findById(requestId);
    if (!request) {
      throw new Error(`Leave request not found: ${requestId}`);
    }

    if (request.status !== LeaveStatus.SUBMITTED) {
      throw new InvalidStateTransitionError(requestId, request.status, LeaveStatus.REJECTED);
    }

    const employee = await this.employeeService.getEmployeeById(request.employeeId);
    if (!employee) {
      throw new Error(`Employee not found: ${request.employeeId}`);
    }

    const isManager = employee.managerId === approverId;
    const isHrAdmin = employee.managerId === null && approverId !== request.employeeId;

    if (!isManager && !isHrAdmin) {
      throw new UnauthorizedApproverError(approverId, requestId);
    }

    const fiscalYear = request.startDate.getFullYear();
    const businessDays = countBusinessDays(request.startDate, request.endDate, DEFAULT_HOLIDAYS);

    await this.balanceService.restoreDays(
      request.employeeId,
      request.leaveTypeId,
      fiscalYear,
      businessDays,
    );

    const updated = await this.requestRepo.updateStatus(requestId, LeaveStatus.REJECTED, {
      rejectionReason: rejectionReason.trim(),
    });
    if (!updated) {
      throw new Error(`Failed to update request status: ${requestId}`);
    }

    await this.auditRepo.create({
      entityType: 'leave_request',
      entityId: requestId,
      action: AuditAction.REJECTED,
      performedBy: approverId,
      details: {
        rejectionReason: rejectionReason.trim(),
        restoredDays: businessDays,
        fiscalYear,
      },
    });

    await this.notificationService.notifyLeaveRejected(toLeaveRequestDTO(updated));

    return updated;
  }

  async cancelRequest(requestId: string, employeeId: string): Promise<LeaveRequest> {
    const request = await this.requestRepo.findById(requestId);
    if (!request) {
      throw new Error(`Leave request not found: ${requestId}`);
    }

    if (request.employeeId !== employeeId) {
      throw new RequestOwnershipError(employeeId, requestId);
    }

    if (request.status !== LeaveStatus.SUBMITTED && request.status !== LeaveStatus.APPROVED) {
      throw new InvalidStateTransitionError(requestId, request.status, LeaveStatus.CANCELLED);
    }

    const wasDeducted =
      request.status === LeaveStatus.SUBMITTED || request.status === LeaveStatus.APPROVED;

    if (wasDeducted) {
      const fiscalYear = request.startDate.getFullYear();
      const businessDays = countBusinessDays(request.startDate, request.endDate, DEFAULT_HOLIDAYS);

      await this.balanceService.restoreDays(
        request.employeeId,
        request.leaveTypeId,
        fiscalYear,
        businessDays,
      );
    }

    const now = new Date();
    const updated = await this.requestRepo.updateStatus(requestId, LeaveStatus.CANCELLED, {
      cancelledAt: now,
    });
    if (!updated) {
      throw new Error(`Failed to update request status: ${requestId}`);
    }

    await this.auditRepo.create({
      entityType: 'leave_request',
      entityId: requestId,
      action: AuditAction.CANCELLED,
      performedBy: employeeId,
      details: {
        cancelledAt: now.toISOString(),
        previousStatus: request.status,
      },
    });

    await this.notificationService.notifyLeaveCancelled(toLeaveRequestDTO(updated));

    return updated;
  }

  async getRequestById(id: string): Promise<LeaveRequest | null> {
    return this.requestRepo.findById(id);
  }

  async getEmployeeRequests(employeeId: string): Promise<LeaveRequest[]> {
    return this.requestRepo.findByEmployee(employeeId);
  }

  async getPendingForManager(managerId: string): Promise<LeaveRequest[]> {
    return this.requestRepo.findPendingByManager(managerId);
  }
}
