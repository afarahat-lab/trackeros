import { LeaveRequest } from './leave-request.model';
import {
  ILeaveRequestRepository,
  StatusUpdateMetadata,
} from './leave-request.repository.interface';
import {
  ILeaveRequestService,
  CreateLeaveRequestInput,
} from './leave-request.service.interface';
import { ILeaveBalanceService } from '../leave-balance';
import { ILeaveBalanceRepository } from '../leave-balance/leave-balance.repository.interface';
import { IAuditRepository } from '../audit';
import { INotificationRepository } from '../notification';
import { ILeavePolicyService, AppError } from '../leave-policy';
import { ILeaveTypeRepository } from '../leave-policy/leave-type.repository.interface';
import { LeaveStatus, LeaveTypeCode } from '../../shared/types';

const PUBLIC_HOLIDAYS: ReadonlySet<string> = new Set([
  '2025-01-01', // New Year's Day
  '2025-01-20', // Martin Luther King Jr. Day
  '2025-02-17', // Presidents' Day
  '2025-05-26', // Memorial Day
  '2025-06-19', // Juneteenth
  '2025-07-04', // Independence Day
  '2025-09-01', // Labor Day
  '2025-10-13', // Columbus Day
  '2025-11-11', // Veterans Day
  '2025-11-27', // Thanksgiving
  '2025-12-25', // Christmas Day
  '2026-01-01', // New Year's Day
  '2026-01-19', // Martin Luther King Jr. Day
  '2026-02-16', // Presidents' Day
  '2026-05-25', // Memorial Day
  '2026-06-19', // Juneteenth
  '2026-07-04', // Independence Day
  '2026-09-07', // Labor Day
  '2026-10-12', // Columbus Day
  '2026-11-11', // Veterans Day
  '2026-11-26', // Thanksgiving
  '2026-12-25', // Christmas Day
]);

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function isPublicHoliday(date: Date): boolean {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return PUBLIC_HOLIDAYS.has(`${y}-${m}-${d}`);
}

function countBusinessDays(startDate: Date, endDate: Date): number {
  let count = 0;
  const current = new Date(startDate);
  current.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  while (current <= end) {
    if (!isWeekend(current) && !isPublicHoliday(current)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export class LeaveRequestService implements ILeaveRequestService {
  constructor(
    private readonly requestRepo: ILeaveRequestRepository,
    private readonly balanceService: ILeaveBalanceService,
    private readonly balanceRepo: ILeaveBalanceRepository,
    private readonly auditRepo: IAuditRepository,
    private readonly notificationRepo: INotificationRepository,
    private readonly policyService: ILeavePolicyService,
    private readonly typeRepo: ILeaveTypeRepository,
  ) {}

  async createDraft(
    employeeId: string,
    dto: CreateLeaveRequestInput,
  ): Promise<LeaveRequest> {
    if (dto.endDate < dto.startDate) {
      throw new AppError('endDate must be on or after startDate', 'VALIDATION_ERROR');
    }

    const leaveType = await this.typeRepo.findByCode(
      dto.leaveTypeId as LeaveTypeCode,
    );
    if (!leaveType) {
      throw new AppError(
        `Leave type '${dto.leaveTypeId}' not found`,
        'NOT_FOUND',
      );
    }
    if (!leaveType.isActive) {
      throw new AppError(
        `Leave type '${dto.leaveTypeId}' is inactive`,
        'POLICY_VIOLATION',
      );
    }

    const policy = await this.policyService.getPolicyForLeaveType(
      dto.leaveTypeId as LeaveTypeCode,
    );

    return this.requestRepo.create({
      employeeId,
      leaveTypeId: dto.leaveTypeId,
      startDate: dto.startDate,
      endDate: dto.endDate,
      reason: dto.reason,
      status: LeaveStatus.DRAFT,
    });
  }

  async submit(id: string, employeeId: string): Promise<LeaveRequest> {
    const request = await this.requestRepo.findById(id);
    if (!request) {
      throw new AppError('Leave request not found', 'NOT_FOUND');
    }

    if (request.employeeId !== employeeId) {
      throw new AppError(
        'You can only submit your own leave requests',
        'FORBIDDEN',
      );
    }

    if (request.status !== LeaveStatus.DRAFT) {
      throw new AppError(
        `Cannot submit a request with status ${request.status}`,
        'INVALID_STATE',
      );
    }

    const leaveType = await this.typeRepo.findByCode(
      request.leaveTypeId as LeaveTypeCode,
    );
    if (!leaveType || !leaveType.isActive) {
      throw new AppError(
        'Leave type is not active',
        'POLICY_VIOLATION',
      );
    }

    const policy = await this.policyService.getPolicyForLeaveType(
      request.leaveTypeId as LeaveTypeCode,
    );

    const isEmergency = leaveType.code === LeaveTypeCode.emergency;

    if (!isEmergency && policy.minimumNoticeDays !== undefined && policy.minimumNoticeDays !== null && policy.minimumNoticeDays > 0) {
      const now = new Date();
      const noticeMs = request.startDate.getTime() - now.getTime();
      const noticeDays = Math.floor(noticeMs / (1000 * 60 * 60 * 24));

      if (noticeDays < policy.minimumNoticeDays) {
        throw new AppError(
          `Minimum notice of ${policy.minimumNoticeDays} day(s) required, but only ${noticeDays} day(s) provided`,
          'POLICY_VIOLATION',
        );
      }
    }

    const overlapping = await this.requestRepo.findOverlapping(
      employeeId,
      request.startDate,
      request.endDate,
      [LeaveStatus.CANCELLED, LeaveStatus.REJECTED, LeaveStatus.DRAFT],
    );

    const conflicting = overlapping.filter((r) => r.id !== id);
    if (conflicting.length > 0) {
      throw new AppError(
        'Overlapping leave request exists',
        'POLICY_VIOLATION',
      );
    }

    const businessDays = countBusinessDays(request.startDate, request.endDate);
    if (businessDays <= 0) {
      throw new AppError(
        'Requested leave period contains no business days',
        'VALIDATION_ERROR',
      );
    }

    const fiscalYear = request.startDate.getFullYear();

    await this.balanceService.reserveDays(
      employeeId,
      policy.id,
      businessDays,
      fiscalYear,
    );

    try {
      const updated = await this.requestRepo.updateStatus(
        id,
        LeaveStatus.SUBMITTED,
        {},
      );

      if (!updated) {
        throw new AppError('Failed to update leave request status', 'INTERNAL_ERROR');
      }

      await this.auditRepo.create({
        entityType: 'LeaveRequest',
        entityId: id,
        action: 'SUBMIT',
        performedBy: employeeId,
        changes: {
          from: LeaveStatus.DRAFT,
          to: LeaveStatus.SUBMITTED,
          businessDays,
          fiscalYear,
        },
      });

      await this.notificationRepo.create({
        recipientId: employeeId,
        type: 'LEAVE_SUBMITTED',
        title: 'Leave Request Submitted',
        message: `Your leave request from ${formatDate(request.startDate)} to ${formatDate(request.endDate)} has been submitted.`,
        relatedEntityType: 'LeaveRequest',
        relatedEntityId: id,
      });

      return updated;
    } catch (error) {
      await this.balanceService.releaseReservation(
        employeeId,
        policy.id,
        businessDays,
        fiscalYear,
      ).catch(() => {
        // Best-effort rollback; log would go here in production
      });
      throw error;
    }
  }

  async approve(id: string, managerId: string): Promise<LeaveRequest> {
    const request = await this.requestRepo.findById(id);
    if (!request) {
      throw new AppError('Leave request not found', 'NOT_FOUND');
    }

    if (request.status !== LeaveStatus.SUBMITTED) {
      throw new AppError(
        `Cannot approve a request with status ${request.status}`,
        'INVALID_STATE',
      );
    }

    if (request.employeeId === managerId) {
      throw new AppError(
        'You cannot approve your own leave request',
        'FORBIDDEN',
      );
    }

    const policy = await this.policyService.getPolicyForLeaveType(
      request.leaveTypeId as LeaveTypeCode,
    );

    const businessDays = countBusinessDays(request.startDate, request.endDate);
    const fiscalYear = request.startDate.getFullYear();

    await this.balanceService.finalizeDeduction(
      request.employeeId,
      policy.id,
      businessDays,
      fiscalYear,
    );

    const metadata: StatusUpdateMetadata = {
      approvedBy: managerId,
      approvedAt: new Date(),
    };

    const updated = await this.requestRepo.updateStatus(
      id,
      LeaveStatus.APPROVED,
      metadata,
    );

    if (!updated) {
      throw new AppError('Failed to update leave request status', 'INTERNAL_ERROR');
    }

    await this.auditRepo.create({
      entityType: 'LeaveRequest',
      entityId: id,
      action: 'APPROVE',
      performedBy: managerId,
      changes: {
        from: LeaveStatus.SUBMITTED,
        to: LeaveStatus.APPROVED,
        businessDays,
        fiscalYear,
      },
    });

    await this.notificationRepo.create({
      recipientId: request.employeeId,
      type: 'LEAVE_APPROVED',
      title: 'Leave Request Approved',
      message: `Your leave request from ${formatDate(request.startDate)} to ${formatDate(request.endDate)} has been approved.`,
      relatedEntityType: 'LeaveRequest',
      relatedEntityId: id,
    });

    return updated;
  }

  async reject(
    id: string,
    managerId: string,
    reason: string,
  ): Promise<LeaveRequest> {
    if (!reason || reason.trim().length === 0) {
      throw new AppError('Rejection reason is required', 'VALIDATION_ERROR');
    }

    const request = await this.requestRepo.findById(id);
    if (!request) {
      throw new AppError('Leave request not found', 'NOT_FOUND');
    }

    if (request.status !== LeaveStatus.SUBMITTED) {
      throw new AppError(
        `Cannot reject a request with status ${request.status}`,
        'INVALID_STATE',
      );
    }

    if (request.employeeId === managerId) {
      throw new AppError(
        'You cannot reject your own leave request',
        'FORBIDDEN',
      );
    }

    const policy = await this.policyService.getPolicyForLeaveType(
      request.leaveTypeId as LeaveTypeCode,
    );

    const businessDays = countBusinessDays(request.startDate, request.endDate);
    const fiscalYear = request.startDate.getFullYear();

    await this.balanceService.releaseReservation(
      request.employeeId,
      policy.id,
      businessDays,
      fiscalYear,
    );

    const metadata: StatusUpdateMetadata = {
      rejectedBy: managerId,
      rejectedAt: new Date(),
      rejectionReason: reason,
    };

    const updated = await this.requestRepo.updateStatus(
      id,
      LeaveStatus.REJECTED,
      metadata,
    );

    if (!updated) {
      throw new AppError('Failed to update leave request status', 'INTERNAL_ERROR');
    }

    await this.auditRepo.create({
      entityType: 'LeaveRequest',
      entityId: id,
      action: 'REJECT',
      performedBy: managerId,
      changes: {
        from: LeaveStatus.SUBMITTED,
        to: LeaveStatus.REJECTED,
        reason,
        businessDays,
        fiscalYear,
      },
    });

    await this.notificationRepo.create({
      recipientId: request.employeeId,
      type: 'LEAVE_REJECTED',
      title: 'Leave Request Rejected',
      message: `Your leave request from ${formatDate(request.startDate)} to ${formatDate(request.endDate)} has been rejected. Reason: ${reason}`,
      relatedEntityType: 'LeaveRequest',
      relatedEntityId: id,
    });

    return updated;
  }

  async cancel(id: string, employeeId: string): Promise<LeaveRequest> {
    const request = await this.requestRepo.findById(id);
    if (!request) {
      throw new AppError('Leave request not found', 'NOT_FOUND');
    }

    if (request.employeeId !== employeeId) {
      throw new AppError(
        'You can only cancel your own leave requests',
        'FORBIDDEN',
      );
    }

    if (
      request.status !== LeaveStatus.SUBMITTED &&
      request.status !== LeaveStatus.APPROVED &&
      request.status !== LeaveStatus.DRAFT
    ) {
      throw new AppError(
        `Cannot cancel a request with status ${request.status}`,
        'INVALID_STATE',
      );
    }

    const policy = await this.policyService.getPolicyForLeaveType(
      request.leaveTypeId as LeaveTypeCode,
    );

    const businessDays = countBusinessDays(request.startDate, request.endDate);
    const fiscalYear = request.startDate.getFullYear();

    if (request.status === LeaveStatus.SUBMITTED) {
      await this.balanceService.releaseReservation(
        employeeId,
        policy.id,
        businessDays,
        fiscalYear,
      );
    } else if (request.status === LeaveStatus.APPROVED) {
      const balance = await this.balanceRepo.findByEmployeeIdAndPolicyId(
        employeeId,
        policy.id,
        fiscalYear,
      );

      if (balance) {
        const newUsedDays = Math.max(0, balance.usedDays - businessDays);
        await this.balanceRepo.update(balance.id, {
          usedDays: newUsedDays,
        });
      }
    }

    const updated = await this.requestRepo.updateStatus(
      id,
      LeaveStatus.CANCELLED,
      {},
    );

    if (!updated) {
      throw new AppError('Failed to update leave request status', 'INTERNAL_ERROR');
    }

    await this.auditRepo.create({
      entityType: 'LeaveRequest',
      entityId: id,
      action: 'CANCEL',
      performedBy: employeeId,
      changes: {
        from: request.status,
        to: LeaveStatus.CANCELLED,
        businessDays,
        fiscalYear,
      },
    });

    await this.notificationRepo.create({
      recipientId: employeeId,
      type: 'LEAVE_CANCELLED',
      title: 'Leave Request Cancelled',
      message: `Your leave request from ${formatDate(request.startDate)} to ${formatDate(request.endDate)} has been cancelled.`,
      relatedEntityType: 'LeaveRequest',
      relatedEntityId: id,
    });

    return updated;
  }

  async getById(id: string): Promise<LeaveRequest> {
    const request = await this.requestRepo.findById(id);
    if (!request) {
      throw new AppError('Leave request not found', 'NOT_FOUND');
    }
    return request;
  }

  async getByEmployee(employeeId: string): Promise<LeaveRequest[]> {
    return this.requestRepo.findByEmployeeId(employeeId);
  }
}
