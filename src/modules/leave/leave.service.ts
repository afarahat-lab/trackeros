import type { ILeaveRequestService, ActorRole } from './leave.service.interface';
import type { LeaveRequest } from './leave.model';
import type { ILeaveRequestRepository } from './leave.repository';
import type { IEmployeeRepository } from '../employee/employee.repository';
import type { ILeavePolicyRepository } from '../policy/policy.repository';
import type { ILeaveBalanceRepository } from '../balance/balance.repository';
import type { IHolidayRepository } from '../../shared/holidays/holiday.repository';
import type { INotificationService } from '../notification/notification.service.interface';
import type { IAuditLogRepository } from '../audit/audit.repository';
import type { CreateLeaveRequestDto } from '../../shared/types/leave-request.dto';
import { LeaveRequestStatus } from '../../shared/types/enums';
import { countBusinessDays } from '../../shared/utils/day-count';

export class LeaveRequestNotFoundError extends Error {
  constructor(id: string) {
    super(`Leave request not found: ${id}`);
    this.name = 'LeaveRequestNotFoundError';
  }
}

export class InvalidStatusTransitionError extends Error {
  constructor(currentStatus: string, targetStatus: string) {
    super(`Cannot transition from ${currentStatus} to ${targetStatus}`);
    this.name = 'InvalidStatusTransitionError';
  }
}

export class EmployeeNotFoundError extends Error {
  constructor(id: string) {
    super(`Employee not found: ${id}`);
    this.name = 'EmployeeNotFoundError';
  }
}

export class PolicyNotFoundError extends Error {
  constructor(id: string) {
    super(`Leave policy not found: ${id}`);
    this.name = 'PolicyNotFoundError';
  }
}

export class PolicyInactiveError extends Error {
  constructor(id: string) {
    super(`Leave policy is not active: ${id}`);
    this.name = 'PolicyInactiveError';
  }
}

export class BalanceNotFoundError extends Error {
  constructor(employeeId: string, leavePolicyId: string, fiscalYear: number) {
    super(`Leave balance not found for employee ${employeeId}, policy ${leavePolicyId}, fiscal year ${fiscalYear}`);
    this.name = 'BalanceNotFoundError';
  }
}

export class InsufficientBalanceError extends Error {
  constructor(remainingDays: number, requestedDays: number) {
    super(`Insufficient balance: ${remainingDays} remaining, ${requestedDays} requested`);
    this.name = 'InsufficientBalanceError';
  }
}

export class ApproverNotAuthorizedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApproverNotAuthorizedError';
  }
}

export class InvalidRejectionReasonError extends Error {
  constructor() {
    super('Rejection reason is required');
    this.name = 'InvalidRejectionReasonError';
  }
}

export class LeaveRequestService implements ILeaveRequestService {
  constructor(
    private readonly leaveRequestRepo: ILeaveRequestRepository,
    private readonly employeeRepo: IEmployeeRepository,
    private readonly policyRepo: ILeavePolicyRepository,
    private readonly balanceRepo: ILeaveBalanceRepository,
    private readonly holidayRepo: IHolidayRepository,
    private readonly notificationService: INotificationService,
    private readonly auditRepo: IAuditLogRepository,
  ) {}

  async submitDraft(leaveRequestId: string, actorId: string): Promise<LeaveRequest> {
    const leaveRequest = await this.leaveRequestRepo.findById(leaveRequestId);
    if (!leaveRequest) {
      throw new LeaveRequestNotFoundError(leaveRequestId);
    }

    if (leaveRequest.status !== LeaveRequestStatus.DRAFT) {
      throw new InvalidStatusTransitionError(leaveRequest.status, LeaveRequestStatus.SUBMITTED);
    }

    const employee = await this.employeeRepo.findById(leaveRequest.employeeId);
    if (!employee) {
      throw new EmployeeNotFoundError(leaveRequest.employeeId);
    }

    const policy = await this.policyRepo.findById(leaveRequest.leavePolicyId);
    if (!policy) {
      throw new PolicyNotFoundError(leaveRequest.leavePolicyId);
    }
    if (!policy.isActive) {
      throw new PolicyInactiveError(leaveRequest.leavePolicyId);
    }

    const fiscalYear = leaveRequest.startDate.getFullYear();

    const holidays = await this.holidayRepo.findByDateRange(leaveRequest.startDate, leaveRequest.endDate);
    const holidayDates = holidays.map((h) => h.date);
    const businessDays = countBusinessDays(leaveRequest.startDate, leaveRequest.endDate, holidayDates);

    const balance = await this.balanceRepo.findByEmployeeAndPolicy(
      leaveRequest.employeeId,
      leaveRequest.leavePolicyId,
      fiscalYear,
    );
    if (!balance) {
      throw new BalanceNotFoundError(leaveRequest.employeeId, leaveRequest.leavePolicyId, fiscalYear);
    }

    if (balance.remainingDays < businessDays) {
      throw new InsufficientBalanceError(balance.remainingDays, businessDays);
    }

    const newUsedDays = balance.usedDays + businessDays;
    await this.balanceRepo.updateUsedDays(balance.id, newUsedDays);

    const updated = await this.leaveRequestRepo.update(leaveRequestId, {
      status: LeaveRequestStatus.SUBMITTED,
    });

    await this.auditRepo.create({
      actorId,
      action: 'LEAVE_SUBMITTED',
      targetId: leaveRequestId,
      targetType: 'LeaveRequest',
      details: { businessDays, fiscalYear, previousStatus: LeaveRequestStatus.DRAFT },
      timestamp: new Date(),
    });

    await this.notificationService.notifyLeaveSubmitted(leaveRequest.employeeId, leaveRequestId);

    return updated!;
  }

  async approve(leaveRequestId: string, approverId: string, approverRole: ActorRole): Promise<LeaveRequest> {
    const leaveRequest = await this.leaveRequestRepo.findById(leaveRequestId);
    if (!leaveRequest) {
      throw new LeaveRequestNotFoundError(leaveRequestId);
    }

    if (leaveRequest.status !== LeaveRequestStatus.SUBMITTED) {
      throw new InvalidStatusTransitionError(leaveRequest.status, LeaveRequestStatus.APPROVED);
    }

    const employee = await this.employeeRepo.findById(leaveRequest.employeeId);
    if (!employee) {
      throw new EmployeeNotFoundError(leaveRequest.employeeId);
    }

    this.validateApproverAuthorization(approverRole, approverId, employee.managerId);

    const updated = await this.leaveRequestRepo.update(leaveRequestId, {
      status: LeaveRequestStatus.APPROVED,
      approvedBy: approverId,
      approvedAt: new Date(),
    });

    await this.auditRepo.create({
      actorId: approverId,
      action: 'LEAVE_APPROVED',
      targetId: leaveRequestId,
      targetType: 'LeaveRequest',
      details: { previousStatus: LeaveRequestStatus.SUBMITTED },
      timestamp: new Date(),
    });

    await this.notificationService.notifyLeaveStatusChange(
      leaveRequest.employeeId,
      leaveRequestId,
      LeaveRequestStatus.SUBMITTED,
      LeaveRequestStatus.APPROVED,
    );

    return updated!;
  }

  async reject(
    leaveRequestId: string,
    rejectorId: string,
    rejectorRole: ActorRole,
    reason: string,
  ): Promise<LeaveRequest> {
    const leaveRequest = await this.leaveRequestRepo.findById(leaveRequestId);
    if (!leaveRequest) {
      throw new LeaveRequestNotFoundError(leaveRequestId);
    }

    if (leaveRequest.status !== LeaveRequestStatus.SUBMITTED) {
      throw new InvalidStatusTransitionError(leaveRequest.status, LeaveRequestStatus.REJECTED);
    }

    if (!reason || reason.trim().length === 0) {
      throw new InvalidRejectionReasonError();
    }

    const employee = await this.employeeRepo.findById(leaveRequest.employeeId);
    if (!employee) {
      throw new EmployeeNotFoundError(leaveRequest.employeeId);
    }

    this.validateApproverAuthorization(rejectorRole, rejectorId, employee.managerId);

    const holidays = await this.holidayRepo.findByDateRange(leaveRequest.startDate, leaveRequest.endDate);
    const holidayDates = holidays.map((h) => h.date);
    const businessDays = countBusinessDays(leaveRequest.startDate, leaveRequest.endDate, holidayDates);

    const fiscalYear = leaveRequest.startDate.getFullYear();
    const balance = await this.balanceRepo.findByEmployeeAndPolicy(
      leaveRequest.employeeId,
      leaveRequest.leavePolicyId,
      fiscalYear,
    );
    if (balance) {
      const restoredUsedDays = balance.usedDays - businessDays;
      await this.balanceRepo.updateUsedDays(balance.id, Math.max(0, restoredUsedDays));
    }

    const updated = await this.leaveRequestRepo.update(leaveRequestId, {
      status: LeaveRequestStatus.REJECTED,
      rejectedBy: rejectorId,
      rejectedAt: new Date(),
      rejectionReason: reason,
    });

    await this.auditRepo.create({
      actorId: rejectorId,
      action: 'LEAVE_REJECTED',
      targetId: leaveRequestId,
      targetType: 'LeaveRequest',
      details: { previousStatus: LeaveRequestStatus.SUBMITTED, reason, businessDays },
      timestamp: new Date(),
    });

    await this.notificationService.notifyLeaveStatusChange(
      leaveRequest.employeeId,
      leaveRequestId,
      LeaveRequestStatus.SUBMITTED,
      LeaveRequestStatus.REJECTED,
    );

    return updated!;
  }

  async cancel(leaveRequestId: string, actorId: string): Promise<LeaveRequest> {
    const leaveRequest = await this.leaveRequestRepo.findById(leaveRequestId);
    if (!leaveRequest) {
      throw new LeaveRequestNotFoundError(leaveRequestId);
    }

    if (
      leaveRequest.status !== LeaveRequestStatus.SUBMITTED &&
      leaveRequest.status !== LeaveRequestStatus.APPROVED
    ) {
      throw new InvalidStatusTransitionError(leaveRequest.status, LeaveRequestStatus.CANCELLED);
    }

    const previousStatus = leaveRequest.status;

    const holidays = await this.holidayRepo.findByDateRange(leaveRequest.startDate, leaveRequest.endDate);
    const holidayDates = holidays.map((h) => h.date);
    const businessDays = countBusinessDays(leaveRequest.startDate, leaveRequest.endDate, holidayDates);

    const fiscalYear = leaveRequest.startDate.getFullYear();
    const balance = await this.balanceRepo.findByEmployeeAndPolicy(
      leaveRequest.employeeId,
      leaveRequest.leavePolicyId,
      fiscalYear,
    );
    if (balance) {
      const restoredUsedDays = balance.usedDays - businessDays;
      await this.balanceRepo.updateUsedDays(balance.id, Math.max(0, restoredUsedDays));
    }

    const updated = await this.leaveRequestRepo.update(leaveRequestId, {
      status: LeaveRequestStatus.CANCELLED,
      cancelledBy: actorId,
      cancelledAt: new Date(),
    });

    await this.auditRepo.create({
      actorId,
      action: 'LEAVE_CANCELLED',
      targetId: leaveRequestId,
      targetType: 'LeaveRequest',
      details: { previousStatus, businessDays },
      timestamp: new Date(),
    });

    await this.notificationService.notifyLeaveStatusChange(
      leaveRequest.employeeId,
      leaveRequestId,
      previousStatus,
      LeaveRequestStatus.CANCELLED,
    );

    return updated!;
  }

  async createDraft(dto: CreateLeaveRequestDto): Promise<LeaveRequest> {
    const leaveRequest = await this.leaveRequestRepo.create({
      employeeId: dto.employeeId,
      leavePolicyId: dto.leavePolicyId,
      startDate: dto.startDate,
      endDate: dto.endDate,
      reason: dto.reason,
      status: LeaveRequestStatus.DRAFT,
      approvedBy: null,
      approvedAt: null,
      rejectedBy: null,
      rejectedAt: null,
      rejectionReason: null,
      cancelledBy: null,
      cancelledAt: null,
    });

    await this.auditRepo.create({
      actorId: dto.employeeId,
      action: 'LEAVE_DRAFT_CREATED',
      targetId: leaveRequest.id,
      targetType: 'LeaveRequest',
      details: null,
      timestamp: new Date(),
    });

    return leaveRequest;
  }

  async findById(id: string): Promise<LeaveRequest | null> {
    return this.leaveRequestRepo.findById(id);
  }

  async findByEmployee(employeeId: string): Promise<LeaveRequest[]> {
    return this.leaveRequestRepo.findByEmployeeId(employeeId);
  }

  private validateApproverAuthorization(
    role: ActorRole,
    actorId: string,
    managerId: string | null,
  ): void {
    if (role === 'employee') {
      throw new ApproverNotAuthorizedError('Employee role is not authorized to approve or reject leave requests');
    }

    if (role === 'hr_admin') {
      return;
    }

    if (role === 'manager') {
      if (managerId === null) {
        throw new ApproverNotAuthorizedError(
          'Employee has no manager; only HR admin may approve or reject',
        );
      }
      if (actorId !== managerId) {
        throw new ApproverNotAuthorizedError(
          'Manager is not the assigned manager of this employee',
        );
      }
      return;
    }

    throw new ApproverNotAuthorizedError(`Unknown role: ${role}`);
  }
}
