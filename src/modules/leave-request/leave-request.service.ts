import { PoolClient } from 'pg';
import { pool } from '../../shared/db/connection';
import { ILeaveRequestService } from './leave-request.service.interface';
import { ILeaveRequestRepository } from './leave-request.repository';
import { IEmployeeRepository } from '../employee/employee.repository';
import { ILeavePolicyRepository } from '../leave-policy/leave-policy.repository';
import { ILeaveBalanceService } from '../leave-balance/leave-balance.service.interface';
import { IAuditLogRepository } from '../audit-log/audit-log.repository';
import { INotificationRepository } from '../notification/notification.repository';
import { LeaveRequest } from './leave-request.model';
import {
  LeaveType,
  LeaveRequestStatus,
  AuditAction,
  NotificationType,
  NotificationStatus,
  EmploymentStatus,
} from '../../shared/types/leave.types';

export class LeaveRequestService implements ILeaveRequestService {
  private readonly publicHolidays: Date[];

  constructor(
    private readonly leaveRequestRepository: ILeaveRequestRepository,
    private readonly employeeRepository: IEmployeeRepository,
    private readonly leavePolicyRepository: ILeavePolicyRepository,
    private readonly leaveBalanceService: ILeaveBalanceService,
    private readonly auditLogRepository: IAuditLogRepository,
    private readonly notificationRepository: INotificationRepository,
    publicHolidays: Date[] = [],
  ) {
    this.publicHolidays = publicHolidays.map(
      (d) => new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
    );
  }

  async submit(
    employeeId: string,
    leaveType: LeaveType,
    startDate: Date,
    endDate: Date,
    reason?: string,
  ): Promise<LeaveRequest> {
    if (endDate < startDate) {
      throw new Error('endDate must be on or after startDate');
    }

    const employee = await this.employeeRepository.findById(employeeId);
    if (!employee) {
      throw new Error(`Employee not found: ${employeeId}`);
    }

    if (employee.employmentStatus !== EmploymentStatus.ACTIVE) {
      throw new Error('Only active employees may submit leave requests');
    }

    const overlapping = await this.leaveRequestRepository.findOverlapping(
      employeeId,
      startDate,
      endDate,
    );
    if (overlapping.length > 0) {
      throw new Error(
        'Leave request overlaps with an existing submitted or approved request',
      );
    }

    if (leaveType !== LeaveType.EMERGENCY) {
      const policies = await this.leavePolicyRepository.findByLeaveType(leaveType);
      const activePolicy = policies.find((p) => p.isActive);
      if (activePolicy && activePolicy.minimumNoticeDays !== null) {
        const today = this.todayUtc();
        const noticeMs = startDate.getTime() - today.getTime();
        const noticeDays = Math.floor(noticeMs / (1000 * 60 * 60 * 24));
        if (noticeDays < activePolicy.minimumNoticeDays) {
          throw new Error(
            `Leave request does not meet minimum notice of ${activePolicy.minimumNoticeDays} day(s)`,
          );
        }
      }
    }

    const businessDays = this.countBusinessDays(startDate, endDate);
    if (businessDays < 1) {
      throw new Error('Leave request must be for at least 1 business day');
    }

    const request = await this.leaveRequestRepository.create({
      employeeId,
      leaveType,
      startDate,
      endDate,
      reason,
      status: LeaveRequestStatus.SUBMITTED,
      approvedBy: null,
      approvedAt: null,
    });

    await this.writeAuditLog(
      'LeaveRequest',
      request.id,
      AuditAction.CREATED,
      null,
      { employeeId, leaveType, startDate, endDate, reason, status: LeaveRequestStatus.SUBMITTED },
      employeeId,
    );

    const notifyRecipientId = employee.managerId ?? employeeId;
    await this.createNotification(
      notifyRecipientId,
      NotificationType.LEAVE_SUBMITTED,
      'Leave Request Submitted',
      `Leave request from ${employee.firstName} ${employee.lastName} for ${leaveType} (${businessDays} business day(s))`,
      'LeaveRequest',
      request.id,
    );

    return request;
  }

  async approve(requestId: string, approverId: string): Promise<LeaveRequest> {
    const request = await this.leaveRequestRepository.findById(requestId);
    if (!request) {
      throw new Error(`Leave request not found: ${requestId}`);
    }

    if (request.status !== LeaveRequestStatus.SUBMITTED) {
      throw new Error(
        `Cannot approve leave request with status ${request.status}`,
      );
    }

    const employee = await this.employeeRepository.findById(request.employeeId);
    if (!employee) {
      throw new Error(`Employee not found: ${request.employeeId}`);
    }

    if (employee.managerId !== null && approverId !== employee.managerId) {
      throw new Error('Only the direct manager may approve this leave request');
    }

    if (approverId === request.employeeId) {
      throw new Error('Self-approval is not permitted');
    }

    const businessDays = this.countBusinessDays(request.startDate, request.endDate);
    const fiscalYear = request.startDate.getUTCFullYear();

    const client: PoolClient = await pool.connect();
    try {
      await client.query('BEGIN');

      await this.leaveBalanceService.deductOnApproval(
        request.employeeId,
        request.leaveType,
        businessDays,
        fiscalYear,
        client,
      );

      const updated = await this.leaveRequestRepository.approveRequest(
        requestId,
        approverId,
        client,
      );
      if (!updated) {
        throw new Error(`Failed to approve leave request: ${requestId}`);
      }

      await client.query('COMMIT');

      await this.writeAuditLog(
        'LeaveRequest',
        requestId,
        AuditAction.APPROVED,
        { status: LeaveRequestStatus.SUBMITTED },
        { status: LeaveRequestStatus.APPROVED, approvedBy: approverId },
        approverId,
      );

      await this.createNotification(
        request.employeeId,
        NotificationType.LEAVE_APPROVED,
        'Leave Request Approved',
        `Your leave request (${request.leaveType}, ${businessDays} business day(s)) has been approved`,
        'LeaveRequest',
        requestId,
      );

      return updated;
    } catch (error: unknown) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async reject(requestId: string, approverId: string): Promise<LeaveRequest> {
    const request = await this.leaveRequestRepository.findById(requestId);
    if (!request) {
      throw new Error(`Leave request not found: ${requestId}`);
    }

    if (request.status !== LeaveRequestStatus.SUBMITTED) {
      throw new Error(
        `Cannot reject leave request with status ${request.status}`,
      );
    }

    const employee = await this.employeeRepository.findById(request.employeeId);
    if (!employee) {
      throw new Error(`Employee not found: ${request.employeeId}`);
    }

    if (employee.managerId !== null && approverId !== employee.managerId) {
      throw new Error('Only the direct manager may reject this leave request');
    }

    if (approverId === request.employeeId) {
      throw new Error('Self-rejection is not permitted');
    }

    const updated = await this.leaveRequestRepository.updateStatus(
      requestId,
      LeaveRequestStatus.REJECTED,
    );
    if (!updated) {
      throw new Error(`Failed to reject leave request: ${requestId}`);
    }

    await this.writeAuditLog(
      'LeaveRequest',
      requestId,
      AuditAction.REJECTED,
      { status: LeaveRequestStatus.SUBMITTED },
      { status: LeaveRequestStatus.REJECTED },
      approverId,
    );

    const businessDays = this.countBusinessDays(request.startDate, request.endDate);
    await this.createNotification(
      request.employeeId,
      NotificationType.LEAVE_REJECTED,
      'Leave Request Rejected',
      `Your leave request (${request.leaveType}, ${businessDays} business day(s)) has been rejected`,
      'LeaveRequest',
      requestId,
    );

    return updated;
  }

  async cancel(requestId: string, employeeId: string): Promise<LeaveRequest> {
    const request = await this.leaveRequestRepository.findById(requestId);
    if (!request) {
      throw new Error(`Leave request not found: ${requestId}`);
    }

    if (
      request.status !== LeaveRequestStatus.DRAFT &&
      request.status !== LeaveRequestStatus.SUBMITTED &&
      request.status !== LeaveRequestStatus.APPROVED
    ) {
      throw new Error(
        `Cannot cancel leave request with status ${request.status}`,
      );
    }

    if (request.employeeId !== employeeId) {
      throw new Error('Only the employee who created the request may cancel it');
    }

    const wasApproved = request.status === LeaveRequestStatus.APPROVED;

    if (wasApproved) {
      const businessDays = this.countBusinessDays(request.startDate, request.endDate);
      const fiscalYear = request.startDate.getUTCFullYear();

      const client: PoolClient = await pool.connect();
      try {
        await client.query('BEGIN');

        await this.leaveBalanceService.releaseOnRejectionOrCancellation(
          request.employeeId,
          request.leaveType,
          businessDays,
          fiscalYear,
          client,
        );

        const updated = await this.leaveRequestRepository.updateStatus(
          requestId,
          LeaveRequestStatus.CANCELLED,
          client,
        );
        if (!updated) {
          throw new Error(`Failed to cancel leave request: ${requestId}`);
        }

        await client.query('COMMIT');

        await this.writeAuditLog(
          'LeaveRequest',
          requestId,
          AuditAction.CANCELLED,
          { status: LeaveRequestStatus.APPROVED },
          { status: LeaveRequestStatus.CANCELLED },
          employeeId,
        );

        const employee = await this.employeeRepository.findById(request.employeeId);
        if (employee && employee.managerId) {
          await this.createNotification(
            employee.managerId,
            NotificationType.LEAVE_CANCELLED,
            'Leave Request Cancelled',
            `A leave request from ${employee.firstName} ${employee.lastName} (${request.leaveType}) has been cancelled`,
            'LeaveRequest',
            requestId,
          );
        }

        return updated;
      } catch (error: unknown) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    }

    const previousStatus = request.status;
    const updated = await this.leaveRequestRepository.updateStatus(
      requestId,
      LeaveRequestStatus.CANCELLED,
    );
    if (!updated) {
      throw new Error(`Failed to cancel leave request: ${requestId}`);
    }

    await this.writeAuditLog(
      'LeaveRequest',
      requestId,
      AuditAction.CANCELLED,
      { status: previousStatus },
      { status: LeaveRequestStatus.CANCELLED },
      employeeId,
    );

    // Notify manager only if the request was previously SUBMITTED or APPROVED
    if (previousStatus === LeaveRequestStatus.SUBMITTED) {
      const employee = await this.employeeRepository.findById(request.employeeId);
      if (employee && employee.managerId) {
        await this.createNotification(
          employee.managerId,
          NotificationType.LEAVE_CANCELLED,
          'Leave Request Cancelled',
          `A leave request from ${employee.firstName} ${employee.lastName} (${request.leaveType}) has been cancelled`,
          'LeaveRequest',
          requestId,
        );
      }
    }

    return updated;
  }

  async findById(requestId: string): Promise<LeaveRequest | null> {
    return this.leaveRequestRepository.findById(requestId);
  }

  async findByEmployeeId(employeeId: string): Promise<LeaveRequest[]> {
    return this.leaveRequestRepository.findByEmployeeId(employeeId);
  }

  async findPendingByManagerId(managerId: string): Promise<LeaveRequest[]> {
    return this.leaveRequestRepository.findAllPendingByManagerId(managerId);
  }

  private countBusinessDays(startDate: Date, endDate: Date): number {
    const start = new Date(
      startDate.getUTCFullYear(),
      startDate.getUTCMonth(),
      startDate.getUTCDate(),
    );
    const end = new Date(
      endDate.getUTCFullYear(),
      endDate.getUTCMonth(),
      endDate.getUTCDate(),
    );

    const holidaySet = new Set<string>();
    for (const h of this.publicHolidays) {
      holidaySet.add(
        `${h.getUTCFullYear()}-${h.getUTCMonth()}-${h.getUTCDate()}`,
      );
    }

    let count = 0;
    const current = new Date(start);
    while (current <= end) {
      const dayOfWeek = current.getUTCDay();
      const key = `${current.getUTCFullYear()}-${current.getUTCMonth()}-${current.getUTCDate()}`;
      if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidaySet.has(key)) {
        count++;
      }
      current.setUTCDate(current.getUTCDate() + 1);
    }

    return count;
  }

  private todayUtc(): Date {
    const now = new Date();
    return new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  }

  private async writeAuditLog(
    entityType: string,
    entityId: string,
    action: AuditAction,
    oldValues: Record<string, unknown> | null,
    newValues: Record<string, unknown> | null,
    performedBy: string,
  ): Promise<void> {
    try {
      await this.auditLogRepository.create({
        entityType,
        entityId,
        action,
        oldValues,
        newValues,
        performedBy,
        performedAt: new Date(),
        ipAddress: null,
        userAgent: null,
      });
    } catch {
      // Audit log failure must not break the main flow
    }
  }

  private async createNotification(
    recipientId: string,
    type: NotificationType,
    title: string,
    message: string,
    relatedEntityType: 'LeaveRequest' | 'LeaveBalance' | null,
    relatedEntityId: string | null,
  ): Promise<void> {
    try {
      await this.notificationRepository.create({
        recipientId,
        type,
        title,
        message,
        relatedEntityType,
        relatedEntityId,
        status: NotificationStatus.PENDING,
      });
    } catch {
      // Notification failure must not break the main flow
    }
  }
}
