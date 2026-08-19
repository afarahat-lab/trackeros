import { LeaveRequest, CreateLeaveRequestDto, LeaveRequestQueryParams } from './leave.model';
import { ILeaveRequestRepository } from './leave.repository';
import { ILeaveService } from './leave.service.interface';
import { IEmployeeService } from '../employee/index';
import { ILeavePolicyService } from '../policy/index';
import { IBalanceService } from '../balance/index';
import { IAuditService } from '../audit/index';
import { LeaveRequestStatus, AuditAction } from '../../shared/types/index';

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

function computeDaysRequested(startDate: Date, endDate: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.floor((endDate.getTime() - startDate.getTime()) / msPerDay) + 1;
}

export class LeaveService implements ILeaveService {
  constructor(
    private readonly repository: ILeaveRequestRepository,
    private readonly employeeService: IEmployeeService,
    private readonly policyService: ILeavePolicyService,
    private readonly balanceService: IBalanceService,
    private readonly auditService: IAuditService,
  ) {}

  async create(data: CreateLeaveRequestDto): Promise<LeaveRequest> {
    if (!data.employeeId || data.employeeId.trim().length === 0) {
      throw new ValidationError('employeeId is required');
    }
    if (!data.leavePolicyId || data.leavePolicyId.trim().length === 0) {
      throw new ValidationError('leavePolicyId is required');
    }
    if (!data.startDate || !data.endDate) {
      throw new ValidationError('startDate and endDate are required');
    }
    if (data.startDate > data.endDate) {
      throw new ValidationError('startDate must be on or before endDate');
    }

    const daysRequested = computeDaysRequested(data.startDate, data.endDate);
    if (daysRequested < 1) {
      throw new ValidationError('daysRequested must be a positive integer >= 1');
    }

    const request = await this.repository.create({
      employeeId: data.employeeId.trim(),
      leavePolicyId: data.leavePolicyId.trim(),
      startDate: data.startDate,
      endDate: data.endDate,
      reason: data.reason ?? undefined,
      status: LeaveRequestStatus.DRAFT,
      approvedBy: null,
      approvedAt: null,
      rejectedBy: null,
      rejectedAt: null,
      rejectionReason: null,
      cancelledBy: null,
      cancelledAt: null,
      cancellationReason: null,
    });

    await this.auditService.log({
      entityType: 'LeaveRequest',
      entityId: request.id,
      action: AuditAction.CREATED,
      performedBy: data.employeeId.trim(),
      changes: {
        employeeId: request.employeeId,
        leavePolicyId: request.leavePolicyId,
        startDate: request.startDate,
        endDate: request.endDate,
        daysRequested,
      },
    });

    return request;
  }

  async submit(id: string): Promise<LeaveRequest> {
    const request = await this.repository.findById(id);
    if (!request) {
      throw new ValidationError('Leave request not found');
    }

    if (request.status !== LeaveRequestStatus.DRAFT) {
      throw new ValidationError('Leave request must be in DRAFT status to submit');
    }

    const employee = await this.employeeService.getById(request.employeeId);
    if (!employee) {
      throw new ValidationError('Employee not found');
    }

    const policy = await this.policyService.getById(request.leavePolicyId);
    if (!policy) {
      throw new ValidationError('Leave policy not found');
    }
    if (!policy.isActive) {
      throw new ValidationError('Leave policy is not active');
    }

    const daysRequested = computeDaysRequested(request.startDate, request.endDate);

    const hasBalance = await this.balanceService.hasSufficientBalance(
      request.employeeId,
      request.leavePolicyId,
      daysRequested,
    );
    if (!hasBalance) {
      throw new ValidationError('Insufficient leave balance');
    }

    if (policy.minimumNoticeDays !== null && policy.minimumNoticeDays !== undefined) {
      const now = new Date();
      const earliestStart = new Date(now.getTime() + policy.minimumNoticeDays * 24 * 60 * 60 * 1000);
      if (request.startDate < earliestStart) {
        throw new ValidationError(
          `Leave request must be submitted at least ${policy.minimumNoticeDays} days before start date`,
        );
      }
    }

    const updated = await this.repository.update(id, {
      status: LeaveRequestStatus.SUBMITTED,
      updatedAt: new Date(),
    });

    if (!updated) {
      throw new ValidationError('Failed to update leave request');
    }

    await this.auditService.log({
      entityType: 'LeaveRequest',
      entityId: id,
      action: AuditAction.SUBMITTED,
      performedBy: request.employeeId,
      changes: {
        previousStatus: LeaveRequestStatus.DRAFT,
        newStatus: LeaveRequestStatus.SUBMITTED,
        daysRequested,
      },
    });

    return updated;
  }

  async approve(id: string, approverId: string): Promise<LeaveRequest> {
    const request = await this.repository.findById(id);
    if (!request) {
      throw new ValidationError('Leave request not found');
    }

    if (request.status !== LeaveRequestStatus.SUBMITTED) {
      throw new ValidationError('Leave request must be in SUBMITTED status to approve');
    }

    const daysRequested = computeDaysRequested(request.startDate, request.endDate);

    const balance = await this.balanceService.getByEmployeeAndPolicy(
      request.employeeId,
      request.leavePolicyId,
    );
    if (!balance) {
      throw new ValidationError('Leave balance not found for employee and policy');
    }

    await this.balanceService.deductDays(balance.id, daysRequested);

    const now = new Date();
    const updated = await this.repository.update(id, {
      status: LeaveRequestStatus.APPROVED,
      approvedBy: approverId,
      approvedAt: now,
      updatedAt: now,
    });

    if (!updated) {
      throw new ValidationError('Failed to update leave request');
    }

    await this.auditService.log({
      entityType: 'LeaveRequest',
      entityId: id,
      action: AuditAction.APPROVED,
      performedBy: approverId,
      changes: {
        previousStatus: LeaveRequestStatus.SUBMITTED,
        newStatus: LeaveRequestStatus.APPROVED,
        daysRequested,
        balanceId: balance.id,
      },
    });

    return updated;
  }

  async reject(id: string, rejectorId: string, reason: string): Promise<LeaveRequest> {
    const request = await this.repository.findById(id);
    if (!request) {
      throw new ValidationError('Leave request not found');
    }

    if (request.status !== LeaveRequestStatus.SUBMITTED) {
      throw new ValidationError('Leave request must be in SUBMITTED status to reject');
    }

    if (!reason || reason.trim().length === 0) {
      throw new ValidationError('Rejection reason is required');
    }

    const now = new Date();
    const updated = await this.repository.update(id, {
      status: LeaveRequestStatus.REJECTED,
      rejectedBy: rejectorId,
      rejectedAt: now,
      rejectionReason: reason.trim(),
      updatedAt: now,
    });

    if (!updated) {
      throw new ValidationError('Failed to update leave request');
    }

    await this.auditService.log({
      entityType: 'LeaveRequest',
      entityId: id,
      action: AuditAction.REJECTED,
      performedBy: rejectorId,
      changes: {
        previousStatus: LeaveRequestStatus.SUBMITTED,
        newStatus: LeaveRequestStatus.REJECTED,
        rejectionReason: reason.trim(),
      },
    });

    return updated;
  }

  async cancel(id: string, cancelledBy: string, reason: string): Promise<LeaveRequest> {
    const request = await this.repository.findById(id);
    if (!request) {
      throw new ValidationError('Leave request not found');
    }

    if (
      request.status !== LeaveRequestStatus.SUBMITTED &&
      request.status !== LeaveRequestStatus.APPROVED
    ) {
      throw new ValidationError(
        'Leave request must be in SUBMITTED or APPROVED status to cancel',
      );
    }

    if (!reason || reason.trim().length === 0) {
      throw new ValidationError('Cancellation reason is required');
    }

    const wasApproved = request.status === LeaveRequestStatus.APPROVED;

    if (wasApproved) {
      const daysRequested = computeDaysRequested(request.startDate, request.endDate);
      const balance = await this.balanceService.getByEmployeeAndPolicy(
        request.employeeId,
        request.leavePolicyId,
      );
      if (!balance) {
        throw new ValidationError('Leave balance not found for employee and policy');
      }
      await this.balanceService.restoreDays(balance.id, daysRequested);
    }

    const now = new Date();
    const updated = await this.repository.update(id, {
      status: LeaveRequestStatus.CANCELLED,
      cancelledBy,
      cancelledAt: now,
      cancellationReason: reason.trim(),
      updatedAt: now,
    });

    if (!updated) {
      throw new ValidationError('Failed to update leave request');
    }

    await this.auditService.log({
      entityType: 'LeaveRequest',
      entityId: id,
      action: AuditAction.CANCELLED,
      performedBy: cancelledBy,
      changes: {
        previousStatus: request.status,
        newStatus: LeaveRequestStatus.CANCELLED,
        cancellationReason: reason.trim(),
        balanceRestored: wasApproved,
      },
    });

    return updated;
  }

  async getById(id: string): Promise<LeaveRequest | null> {
    return this.repository.findById(id);
  }

  async getByEmployee(employeeId: string): Promise<LeaveRequest[]> {
    return this.repository.findByEmployee(employeeId);
  }

  async query(params: LeaveRequestQueryParams): Promise<LeaveRequest[]> {
    return this.repository.query(params);
  }
}
