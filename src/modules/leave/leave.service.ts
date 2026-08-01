import {
  AuditAction,
  CreateLeaveRequestDto,
  EmploymentStatus,
  LeaveRequestQueryParams,
  LeaveRequestStatus,
} from '../../shared/types';
import { calculateBusinessDays, getHolidaysForYear } from '../../shared/utils';
import { IAuditRepository } from '../audit';
import { IBalanceRepository, InsufficientBalanceError } from '../balance';
import { IEmployeeRepository } from '../employee';
import { INotificationRepository } from '../notification';
import { IPolicyRepository } from '../policy';
import { ILeaveRepository, LeaveRequest } from './leave.model';
import { ILeaveService } from './leave.service.interface';

export class LeaveService implements ILeaveService {
  constructor(
    private readonly leaveRepository: ILeaveRepository,
    private readonly balanceRepository: IBalanceRepository,
    private readonly employeeRepository: IEmployeeRepository,
    private readonly policyRepository: IPolicyRepository,
    private readonly notificationRepository: INotificationRepository,
    private readonly auditRepository: IAuditRepository,
  ) {}

  async submitLeaveRequest(dto: CreateLeaveRequestDto): Promise<LeaveRequest> {
    const employee = await this.employeeRepository.findById(dto.employeeId);
    if (!employee) {
      throw new Error(`Employee not found: ${dto.employeeId}`);
    }
    if (employee.employmentStatus !== EmploymentStatus.ACTIVE) {
      throw new Error(
        `Employee is not active: status=${employee.employmentStatus}`,
      );
    }

    const policy = await this.policyRepository.findById(dto.policyId);
    if (!policy) {
      throw new Error(`Policy not found: ${dto.policyId}`);
    }
    if (!policy.isActive) {
      throw new Error(`Policy is not active: ${dto.policyId}`);
    }

    const fiscalYear = dto.startDate.getUTCFullYear();

    let balance = await this.balanceRepository.findByEmployeeAndPolicy(
      dto.employeeId,
      dto.policyId,
      fiscalYear,
    );

    if (!balance) {
      balance = await this.balanceRepository.create({
        employeeId: dto.employeeId,
        policyId: dto.policyId,
        totalEntitlement: policy.entitlementDays,
        usedDays: 0,
        fiscalYear,
        status: 'ACTIVE',
      });
    }

    const holidays = await getHolidaysForYear(fiscalYear);
    const requestedDays = calculateBusinessDays(
      dto.startDate,
      dto.endDate,
      holidays,
    );

    const availableDays = balance.totalEntitlement - balance.usedDays;
    if (availableDays < requestedDays) {
      throw new InsufficientBalanceError(
        balance.id,
        requestedDays,
        availableDays,
      );
    }

    await this.balanceRepository.incrementUsedDays(balance.id, requestedDays);

    const leaveRequest = await this.leaveRepository.create({
      employeeId: dto.employeeId,
      policyId: dto.policyId,
      startDate: dto.startDate,
      endDate: dto.endDate,
      reason: dto.reason,
      status: LeaveRequestStatus.SUBMITTED,
      approvedBy: null,
      approvedAt: null,
      rejectionReason: null,
    });

    await this.auditRepository.create({
      entityType: 'leave_request',
      entityId: leaveRequest.id,
      action: AuditAction.CREATE,
      oldValues: null,
      newValues: {
        employeeId: leaveRequest.employeeId,
        policyId: leaveRequest.policyId,
        startDate: leaveRequest.startDate.toISOString(),
        endDate: leaveRequest.endDate.toISOString(),
        status: leaveRequest.status,
        requestedDays,
      },
      performedBy: dto.employeeId,
      performedAt: new Date(),
    });

    if (employee.managerId) {
      await this.notificationRepository.create({
        recipientId: employee.managerId,
        type: 'leave_submitted',
        title: 'New Leave Request',
        message: `${employee.firstName} ${employee.lastName} has submitted a leave request for ${requestedDays} day(s).`,
        relatedEntityType: 'leave_request',
        relatedEntityId: leaveRequest.id,
        status: 'PENDING',
      });
    } else {
      const allEmployees = await this.employeeRepository.findAll();
      const hrAdmins = allEmployees.filter((e) => e.role === 'hr_admin');

      for (const admin of hrAdmins) {
        await this.notificationRepository.create({
          recipientId: admin.id,
          type: 'leave_submitted',
          title: 'New Leave Request (No Manager)',
          message: `${employee.firstName} ${employee.lastName} (no manager) has submitted a leave request for ${requestedDays} day(s). Requires HR admin approval.`,
          relatedEntityType: 'leave_request',
          relatedEntityId: leaveRequest.id,
          status: 'PENDING',
        });
      }
    }

    return leaveRequest;
  }

  async approveLeaveRequest(
    requestId: string,
    approverId: string,
  ): Promise<LeaveRequest> {
    const request = await this.leaveRepository.findById(requestId);
    if (!request) {
      throw new Error(`Leave request not found: ${requestId}`);
    }
    if (request.status !== LeaveRequestStatus.SUBMITTED) {
      throw new Error(
        `Cannot approve request with status: ${request.status}`,
      );
    }

    const updated = await this.leaveRepository.updateStatus(
      requestId,
      LeaveRequestStatus.APPROVED,
      approverId,
      null,
    );

    if (!updated) {
      throw new Error(`Failed to update leave request: ${requestId}`);
    }

    await this.auditRepository.create({
      entityType: 'leave_request',
      entityId: requestId,
      action: AuditAction.APPROVE,
      oldValues: { status: LeaveRequestStatus.SUBMITTED },
      newValues: {
        status: LeaveRequestStatus.APPROVED,
        approvedBy: approverId,
        approvedAt: updated.approvedAt?.toISOString(),
      },
      performedBy: approverId,
      performedAt: new Date(),
    });

    await this.notificationRepository.create({
      recipientId: request.employeeId,
      type: 'leave_approved',
      title: 'Leave Request Approved',
      message: 'Your leave request has been approved.',
      relatedEntityType: 'leave_request',
      relatedEntityId: requestId,
      status: 'PENDING',
    });

    return updated;
  }

  async rejectLeaveRequest(
    requestId: string,
    approverId: string,
    reason: string,
  ): Promise<LeaveRequest> {
    const request = await this.leaveRepository.findById(requestId);
    if (!request) {
      throw new Error(`Leave request not found: ${requestId}`);
    }
    if (request.status !== LeaveRequestStatus.SUBMITTED) {
      throw new Error(
        `Cannot reject request with status: ${request.status}`,
      );
    }

    const updated = await this.leaveRepository.updateStatus(
      requestId,
      LeaveRequestStatus.REJECTED,
      null,
      reason,
    );

    if (!updated) {
      throw new Error(`Failed to update leave request: ${requestId}`);
    }

    const fiscalYear = request.startDate.getUTCFullYear();
    const holidays = await getHolidaysForYear(fiscalYear);
    const requestedDays = calculateBusinessDays(
      request.startDate,
      request.endDate,
      holidays,
    );

    const balance = await this.balanceRepository.findByEmployeeAndPolicy(
      request.employeeId,
      request.policyId,
      fiscalYear,
    );

    if (balance) {
      await this.balanceRepository.decrementUsedDays(balance.id, requestedDays);
    }

    await this.auditRepository.create({
      entityType: 'leave_request',
      entityId: requestId,
      action: AuditAction.REJECT,
      oldValues: { status: LeaveRequestStatus.SUBMITTED },
      newValues: {
        status: LeaveRequestStatus.REJECTED,
        rejectionReason: reason,
      },
      performedBy: approverId,
      performedAt: new Date(),
    });

    await this.notificationRepository.create({
      recipientId: request.employeeId,
      type: 'leave_rejected',
      title: 'Leave Request Rejected',
      message: `Your leave request has been rejected. Reason: ${reason}`,
      relatedEntityType: 'leave_request',
      relatedEntityId: requestId,
      status: 'PENDING',
    });

    return updated;
  }

  async cancelLeaveRequest(
    requestId: string,
    employeeId: string,
  ): Promise<LeaveRequest> {
    const request = await this.leaveRepository.findById(requestId);
    if (!request) {
      throw new Error(`Leave request not found: ${requestId}`);
    }
    if (
      request.status !== LeaveRequestStatus.SUBMITTED &&
      request.status !== LeaveRequestStatus.APPROVED
    ) {
      throw new Error(
        `Cannot cancel request with status: ${request.status}`,
      );
    }
    if (request.employeeId !== employeeId) {
      throw new Error(
        `Employee mismatch: request belongs to ${request.employeeId}, not ${employeeId}`,
      );
    }

    const updated = await this.leaveRepository.updateStatus(
      requestId,
      LeaveRequestStatus.CANCELLED,
      null,
      null,
    );

    if (!updated) {
      throw new Error(`Failed to update leave request: ${requestId}`);
    }

    const fiscalYear = request.startDate.getUTCFullYear();
    const holidays = await getHolidaysForYear(fiscalYear);
    const requestedDays = calculateBusinessDays(
      request.startDate,
      request.endDate,
      holidays,
    );

    const balance = await this.balanceRepository.findByEmployeeAndPolicy(
      request.employeeId,
      request.policyId,
      fiscalYear,
    );

    if (balance) {
      await this.balanceRepository.decrementUsedDays(balance.id, requestedDays);
    }

    await this.auditRepository.create({
      entityType: 'leave_request',
      entityId: requestId,
      action: AuditAction.UPDATE,
      oldValues: { status: request.status },
      newValues: { status: LeaveRequestStatus.CANCELLED },
      performedBy: employeeId,
      performedAt: new Date(),
    });

    return updated;
  }

  async getLeaveRequest(requestId: string): Promise<LeaveRequest | null> {
    return this.leaveRepository.findById(requestId);
  }

  async getEmployeeLeaveRequests(
    employeeId: string,
    params?: LeaveRequestQueryParams,
  ): Promise<LeaveRequest[]> {
    return this.leaveRepository.findByEmployeeId(employeeId, params);
  }
}
