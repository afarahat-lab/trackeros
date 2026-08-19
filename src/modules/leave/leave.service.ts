import { LeaveRequest, CreateLeaveRequestDto, LeaveRequestQueryParams } from './leave.model';
import { ILeaveRequestRepository } from './leave.repository';
import { ILeaveService } from './leave.service.interface';
import { IEmployeeService } from '../employee/employee.service.interface';
import { ILeavePolicyService } from '../policy/policy.service.interface';
import { IBalanceService } from '../balance/balance.service.interface';
import { IAuditService, CreateAuditRecordDto } from '../audit/audit.service.interface';
import { LeaveRequestStatus, AuditAction } from '../../shared/types/index';

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

function computeDaysRequested(startDate: Date, endDate: Date): number {
  return Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

export class LeaveService implements ILeaveService {
  constructor(
    private readonly leaveRequestRepository: ILeaveRequestRepository,
    private readonly employeeService: IEmployeeService,
    private readonly leavePolicyService: ILeavePolicyService,
    private readonly balanceService: IBalanceService,
    private readonly auditService: IAuditService,
  ) {}

  async create(data: CreateLeaveRequestDto): Promise<LeaveRequest> {
    if (!data.employeeId || data.employeeId.trim().length === 0) {
      throw new ValidationError('employeeId is required and must not be empty');
    }
    if (!data.leavePolicyId || data.leavePolicyId.trim().length === 0) {
      throw new ValidationError('leavePolicyId is required and must not be empty');
    }
    if (!(data.startDate instanceof Date) || isNaN(data.startDate.getTime())) {
      throw new ValidationError('startDate must be a valid Date');
    }
    if (!(data.endDate instanceof Date) || isNaN(data.endDate.getTime())) {
      throw new ValidationError('endDate must be a valid Date');
    }
    if (data.endDate < data.startDate) {
      throw new ValidationError('endDate must not be before startDate');
    }

    const daysRequested = computeDaysRequested(data.startDate, data.endDate);
    if (daysRequested <= 0) {
      throw new ValidationError('daysRequested must be greater than zero');
    }

    return this.leaveRequestRepository.create({
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
  }

  async submit(id: string): Promise<LeaveRequest> {
    const leaveRequest = await this.leaveRequestRepository.findById(id);
    if (!leaveRequest) {
      throw new NotFoundError('LeaveRequest not found');
    }

    if (leaveRequest.status !== LeaveRequestStatus.DRAFT) {
      throw new ConflictError('LeaveRequest status must be DRAFT to submit');
    }

    const employee = await this.employeeService.getById(leaveRequest.employeeId);
    if (!employee) {
      throw new ValidationError('Employee not found');
    }

    const policy = await this.leavePolicyService.getById(leaveRequest.leavePolicyId);
    if (!policy) {
      throw new ValidationError('Leave policy not found');
    }
    if (!policy.isActive) {
      throw new ValidationError('Leave policy is not active');
    }

    const daysRequested = computeDaysRequested(leaveRequest.startDate, leaveRequest.endDate);

    const hasBalance = await this.balanceService.hasSufficientBalance(
      leaveRequest.employeeId,
      leaveRequest.leavePolicyId,
      daysRequested,
    );
    if (!hasBalance) {
      throw new ValidationError('Insufficient leave balance');
    }

    if (policy.minimumNoticeDays !== null && policy.minimumNoticeDays !== undefined) {
      const now = new Date();
      const earliestStart = new Date(now.getTime() + policy.minimumNoticeDays * 24 * 60 * 60 * 1000);
      if (leaveRequest.startDate < earliestStart) {
        throw new ValidationError(
          `Leave request must be submitted at least ${policy.minimumNoticeDays} days before start date`,
        );
      }
    }

    const updated = await this.leaveRequestRepository.update(id, {
      status: LeaveRequestStatus.SUBMITTED,
      updatedAt: new Date(),
    });

    if (!updated) {
      throw new NotFoundError('LeaveRequest not found after update');
    }

    await this.auditService.log({
      entityType: 'LeaveRequest',
      entityId: leaveRequest.id,
      action: AuditAction.CREATED,
      performedBy: leaveRequest.employeeId,
    });

    return updated;
  }

  async approve(id: string, approverId: string): Promise<LeaveRequest> {
    const leaveRequest = await this.leaveRequestRepository.findById(id);
    if (!leaveRequest) {
      throw new NotFoundError('LeaveRequest not found');
    }

    if (leaveRequest.status !== LeaveRequestStatus.SUBMITTED) {
      throw new ConflictError('LeaveRequest status must be SUBMITTED to approve');
    }

    const daysRequested = computeDaysRequested(leaveRequest.startDate, leaveRequest.endDate);

    const balance = await this.balanceService.getByEmployeeAndPolicy(
      leaveRequest.employeeId,
      leaveRequest.leavePolicyId,
    );
    if (!balance) {
      throw new ValidationError('No balance record found for employee and policy');
    }

    await this.balanceService.deductDays(balance.id, daysRequested);

    const updated = await this.leaveRequestRepository.update(id, {
      status: LeaveRequestStatus.APPROVED,
      approvedBy: approverId,
      approvedAt: new Date(),
      updatedAt: new Date(),
    });

    if (!updated) {
      throw new NotFoundError('LeaveRequest not found after update');
    }

    await this.auditService.log({
      entityType: 'LeaveRequest',
      entityId: leaveRequest.id,
      action: AuditAction.APPROVED,
      performedBy: approverId,
    });

    return updated;
  }

  async reject(id: string, rejectorId: string, reason: string): Promise<LeaveRequest> {
    const leaveRequest = await this.leaveRequestRepository.findById(id);
    if (!leaveRequest) {
      throw new NotFoundError('LeaveRequest not found');
    }

    if (leaveRequest.status !== LeaveRequestStatus.SUBMITTED) {
      throw new ConflictError('LeaveRequest status must be SUBMITTED to reject');
    }

    if (!reason || reason.trim().length === 0) {
      throw new ValidationError('rejectionReason is required and must not be empty');
    }

    const updated = await this.leaveRequestRepository.update(id, {
      status: LeaveRequestStatus.REJECTED,
      rejectedBy: rejectorId,
      rejectedAt: new Date(),
      rejectionReason: reason.trim(),
      updatedAt: new Date(),
    });

    if (!updated) {
      throw new NotFoundError('LeaveRequest not found after update');
    }

    await this.auditService.log({
      entityType: 'LeaveRequest',
      entityId: leaveRequest.id,
      action: AuditAction.REJECTED,
      performedBy: rejectorId,
    });

    return updated;
  }

  async cancel(id: string, cancelledBy: string, reason: string): Promise<LeaveRequest> {
    const leaveRequest = await this.leaveRequestRepository.findById(id);
    if (!leaveRequest) {
      throw new NotFoundError('LeaveRequest not found');
    }

    if (
      leaveRequest.status !== LeaveRequestStatus.SUBMITTED &&
      leaveRequest.status !== LeaveRequestStatus.APPROVED
    ) {
      throw new ConflictError('LeaveRequest status must be SUBMITTED or APPROVED to cancel');
    }

    if (!reason || reason.trim().length === 0) {
      throw new ValidationError('cancellationReason is required and must not be empty');
    }

    if (leaveRequest.status === LeaveRequestStatus.APPROVED) {
      const daysRequested = computeDaysRequested(leaveRequest.startDate, leaveRequest.endDate);
      const balance = await this.balanceService.getByEmployeeAndPolicy(
        leaveRequest.employeeId,
        leaveRequest.leavePolicyId,
      );
      if (balance) {
        await this.balanceService.restoreDays(balance.id, daysRequested);
      }
    }

    const updated = await this.leaveRequestRepository.update(id, {
      status: LeaveRequestStatus.CANCELLED,
      cancelledBy,
      cancelledAt: new Date(),
      cancellationReason: reason.trim(),
      updatedAt: new Date(),
    });

    if (!updated) {
      throw new NotFoundError('LeaveRequest not found after update');
    }

    await this.auditService.log({
      entityType: 'LeaveRequest',
      entityId: leaveRequest.id,
      action: AuditAction.CANCELLED,
      performedBy: cancelledBy,
    });

    return updated;
  }

  async getById(id: string): Promise<LeaveRequest | null> {
    return this.leaveRequestRepository.findById(id);
  }

  async getByEmployee(employeeId: string): Promise<LeaveRequest[]> {
    return this.leaveRequestRepository.findByEmployee(employeeId);
  }

  async query(params: LeaveRequestQueryParams): Promise<LeaveRequest[]> {
    return this.leaveRequestRepository.query(params);
  }
}
