import { ILeaveService, CreateLeaveRequestDto, UserRole } from './leave.service.interface';
import { ILeaveRepository } from './leave.repository';
import { IEmployeeService } from '../employee';
import { IPolicyService } from '../policy';
import { IBalanceService } from '../balance';
import { IAuditService } from '../audit';
import { LeaveRequest } from './leave.model';
import { LeaveRequestStatus } from '../../shared/types/leave-request-status.enum';
import { LeaveType } from '../../shared/types/leave-type.enum';
import {
  InsufficientBalanceError,
  OverlappingRequestError,
  EmployeeNotActiveError,
  MinimumNoticeError,
  NotManagerError,
} from './leave.errors';

export function countBusinessDays(startDate: Date, endDate: Date): number {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  if (end < start) {
    return 0;
  }

  let count = 0;
  const current = new Date(start);

  while (current <= end) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
}

export class LeaveService implements ILeaveService {
  constructor(
    private readonly leaveRepository: ILeaveRepository,
    private readonly employeeService: IEmployeeService,
    private readonly policyService: IPolicyService,
    private readonly balanceService: IBalanceService,
    private readonly auditService: IAuditService,
  ) {}

  async createDraft(dto: CreateLeaveRequestDto): Promise<LeaveRequest> {
    const request = await this.leaveRepository.create({
      employeeId: dto.employeeId,
      leavePolicyId: dto.leavePolicyId,
      startDate: dto.startDate,
      endDate: dto.endDate,
      reason: dto.reason,
      status: LeaveRequestStatus.DRAFT,
      approvedBy: null,
      approvedAt: null,
    });

    await this.auditService.log({
      entityType: 'LeaveRequest',
      entityId: request.id,
      action: 'createDraft',
      oldValues: null,
      newValues: this.requestToRecord(request),
      performedBy: dto.employeeId,
    });

    return request;
  }

  async submitDraft(requestId: string, employeeId: string): Promise<LeaveRequest> {
    const request = await this.leaveRepository.findById(requestId);
    if (!request) {
      throw new Error('Leave request not found');
    }

    if (request.status !== LeaveRequestStatus.DRAFT) {
      throw new Error('Only draft requests can be submitted');
    }

    if (request.employeeId !== employeeId) {
      throw new Error('Only the owning employee may submit their own draft');
    }

    const isActive = await this.employeeService.isActive(employeeId);
    if (!isActive) {
      throw new EmployeeNotActiveError(employeeId);
    }

    const overlapping = await this.leaveRepository.findOverlapping(
      employeeId,
      request.startDate,
      request.endDate,
      requestId,
    );
    if (overlapping.length > 0) {
      throw new OverlappingRequestError(employeeId, request.startDate, request.endDate);
    }

    const policy = await this.policyService.getById(request.leavePolicyId);
    if (!policy) {
      throw new Error('Leave policy not found');
    }

    const businessDays = countBusinessDays(request.startDate, request.endDate);

    if (policy.leaveType !== LeaveType.EMERGENCY && policy.minimumNoticeDays != null) {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const startDate = new Date(request.startDate);
      startDate.setHours(0, 0, 0, 0);
      const noticeMs = startDate.getTime() - now.getTime();
      const noticeDays = Math.floor(noticeMs / (1000 * 60 * 60 * 24));

      if (noticeDays < policy.minimumNoticeDays) {
        throw new MinimumNoticeError(policy.minimumNoticeDays, noticeDays);
      }
    }

    const availableDays = await this.balanceService.getAvailableDays(
      employeeId,
      request.leavePolicyId,
    );
    if (availableDays < businessDays) {
      throw new InsufficientBalanceError(employeeId, businessDays, availableDays);
    }

    await this.balanceService.reserveDays(employeeId, request.leavePolicyId, businessDays);

    const oldValues = this.requestToRecord(request);

    const updated = await this.leaveRepository.update(requestId, {
      status: LeaveRequestStatus.SUBMITTED,
    });

    if (!updated) {
      throw new Error('Failed to update leave request');
    }

    await this.auditService.log({
      entityType: 'LeaveRequest',
      entityId: requestId,
      action: 'submitDraft',
      oldValues,
      newValues: this.requestToRecord(updated),
      performedBy: employeeId,
    });

    return updated;
  }

  async approve(
    requestId: string,
    approverId: string,
    approverRole: UserRole,
  ): Promise<LeaveRequest> {
    const request = await this.leaveRepository.findById(requestId);
    if (!request) {
      throw new Error('Leave request not found');
    }

    if (request.status !== LeaveRequestStatus.SUBMITTED) {
      throw new Error('Only submitted requests can be approved');
    }

    if (request.employeeId === approverId) {
      throw new NotManagerError(approverId);
    }

    const managerId = await this.employeeService.getManagerId(request.employeeId);

    if (managerId === null) {
      if (approverRole !== 'hr_admin') {
        throw new NotManagerError(approverId);
      }
    } else {
      if (approverId !== managerId && approverRole !== 'hr_admin') {
        throw new NotManagerError(approverId);
      }
    }

    const policy = await this.policyService.getById(request.leavePolicyId);
    if (!policy) {
      throw new Error('Leave policy not found');
    }

    const businessDays = countBusinessDays(request.startDate, request.endDate);

    await this.balanceService.deductDays(request.employeeId, request.leavePolicyId, businessDays);

    const oldValues = this.requestToRecord(request);

    const updateData: Partial<LeaveRequest> = {
      status: LeaveRequestStatus.APPROVED,
    };

    if (policy.requiresManagerApproval) {
      updateData.approvedBy = approverId;
      updateData.approvedAt = new Date();
    }

    const updated = await this.leaveRepository.update(requestId, updateData);

    if (!updated) {
      throw new Error('Failed to update leave request');
    }

    await this.auditService.log({
      entityType: 'LeaveRequest',
      entityId: requestId,
      action: 'approve',
      oldValues,
      newValues: this.requestToRecord(updated),
      performedBy: approverId,
    });

    return updated;
  }

  async reject(
    requestId: string,
    approverId: string,
    approverRole: UserRole,
  ): Promise<LeaveRequest> {
    const request = await this.leaveRepository.findById(requestId);
    if (!request) {
      throw new Error('Leave request not found');
    }

    if (request.status !== LeaveRequestStatus.SUBMITTED) {
      throw new Error('Only submitted requests can be rejected');
    }

    if (request.employeeId === approverId) {
      throw new NotManagerError(approverId);
    }

    const managerId = await this.employeeService.getManagerId(request.employeeId);

    if (managerId === null) {
      if (approverRole !== 'hr_admin') {
        throw new NotManagerError(approverId);
      }
    } else {
      if (approverId !== managerId && approverRole !== 'hr_admin') {
        throw new NotManagerError(approverId);
      }
    }

    const businessDays = countBusinessDays(request.startDate, request.endDate);

    await this.balanceService.releaseReservation(
      request.employeeId,
      request.leavePolicyId,
      businessDays,
    );

    const oldValues = this.requestToRecord(request);

    const updated = await this.leaveRepository.update(requestId, {
      status: LeaveRequestStatus.REJECTED,
    });

    if (!updated) {
      throw new Error('Failed to update leave request');
    }

    await this.auditService.log({
      entityType: 'LeaveRequest',
      entityId: requestId,
      action: 'reject',
      oldValues,
      newValues: this.requestToRecord(updated),
      performedBy: approverId,
    });

    return updated;
  }

  async cancel(requestId: string, employeeId: string): Promise<LeaveRequest> {
    const request = await this.leaveRepository.findById(requestId);
    if (!request) {
      throw new Error('Leave request not found');
    }

    if (request.employeeId !== employeeId) {
      throw new Error('Only the owning employee may cancel their own request');
    }

    if (
      request.status === LeaveRequestStatus.REJECTED ||
      request.status === LeaveRequestStatus.CANCELLED
    ) {
      throw new Error('Cannot cancel a request that is already in a terminal state');
    }

    const oldValues = this.requestToRecord(request);

    if (
      request.status === LeaveRequestStatus.SUBMITTED ||
      request.status === LeaveRequestStatus.APPROVED
    ) {
      const businessDays = countBusinessDays(request.startDate, request.endDate);
      await this.balanceService.releaseReservation(
        request.employeeId,
        request.leavePolicyId,
        businessDays,
      );
    }

    const updated = await this.leaveRepository.update(requestId, {
      status: LeaveRequestStatus.CANCELLED,
    });

    if (!updated) {
      throw new Error('Failed to update leave request');
    }

    await this.auditService.log({
      entityType: 'LeaveRequest',
      entityId: requestId,
      action: 'cancel',
      oldValues,
      newValues: this.requestToRecord(updated),
      performedBy: employeeId,
    });

    return updated;
  }

  async getById(requestId: string): Promise<LeaveRequest | null> {
    return this.leaveRepository.findById(requestId);
  }

  async getByEmployee(employeeId: string): Promise<LeaveRequest[]> {
    return this.leaveRepository.findByEmployee(employeeId);
  }

  private requestToRecord(request: LeaveRequest): Record<string, unknown> {
    return {
      id: request.id,
      employeeId: request.employeeId,
      leavePolicyId: request.leavePolicyId,
      startDate: request.startDate.toISOString(),
      endDate: request.endDate.toISOString(),
      reason: request.reason ?? null,
      status: request.status,
      approvedBy: request.approvedBy,
      approvedAt: request.approvedAt?.toISOString() ?? null,
    };
  }
}
