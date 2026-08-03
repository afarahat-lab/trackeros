import { ILeaveRequestRepository } from './leave-request.repository';
import { ILeaveBalanceRepository } from '../leave-balance/leave-balance.repository';
import { IEmployeeRepository } from '../employee/employee.repository';
import { ILeavePolicyRepository } from '../leave-policy/leave-policy.repository';
import { ILeaveRequestService } from './leave-request.service.interface';
import { LeaveRequest, CreateLeaveRequestDto } from './leave-request.model';
import { LeaveRequestStatus } from '../../shared/types';
import { countBusinessDays } from '../../shared/utils/business-days';

export class InsufficientBalanceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InsufficientBalanceError';
  }
}

export class ApproverNotAuthorizedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApproverNotAuthorizedError';
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class LeaveRequestNotFoundError extends Error {
  constructor(id: string) {
    super(`Leave request with id ${id} not found`);
    this.name = 'LeaveRequestNotFoundError';
  }
}

export class LeaveRequestService implements ILeaveRequestService {
  constructor(
    private readonly leaveRequestRepo: ILeaveRequestRepository,
    private readonly leaveBalanceRepo: ILeaveBalanceRepository,
    private readonly employeeRepo: IEmployeeRepository,
    private readonly leavePolicyRepo: ILeavePolicyRepository,
  ) {}

  async submit(
    dto: CreateLeaveRequestDto,
    actorId: string,
    actorRole: 'employee' | 'manager' | 'hr_admin',
  ): Promise<LeaveRequest> {
    if (actorRole === 'employee' && actorId !== dto.employeeId) {
      throw new ApproverNotAuthorizedError(
        'Employee may only submit their own leave requests',
      );
    }

    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    const startDate = new Date(
      Date.UTC(dto.startDate.getUTCFullYear(), dto.startDate.getUTCMonth(), dto.startDate.getUTCDate()),
    );
    const endDate = new Date(
      Date.UTC(dto.endDate.getUTCFullYear(), dto.endDate.getUTCMonth(), dto.endDate.getUTCDate()),
    );

    if (startDate.getTime() < today.getTime()) {
      throw new ValidationError('startDate must not be in the past');
    }

    if (endDate.getTime() < startDate.getTime()) {
      throw new ValidationError('startDate must be on or before endDate');
    }

    const employee = await this.employeeRepo.findById(dto.employeeId);
    if (!employee) {
      throw new ValidationError(`Employee with id ${dto.employeeId} not found`);
    }

    const policy = await this.leavePolicyRepo.findById(dto.leavePolicyId);
    if (!policy) {
      throw new ValidationError(`Leave policy with id ${dto.leavePolicyId} not found`);
    }

    if (policy.minimumNoticeDays !== undefined && policy.minimumNoticeDays > 0) {
      const noticeMs = startDate.getTime() - today.getTime();
      const noticeDays = Math.floor(noticeMs / (1000 * 60 * 60 * 24));
      if (noticeDays < policy.minimumNoticeDays) {
        throw new ValidationError(
          `Request requires at least ${policy.minimumNoticeDays} days notice, but only ${noticeDays} days provided`,
        );
      }
    }

    const businessDays = countBusinessDays(startDate, endDate, []);

    if (businessDays <= 0) {
      throw new ValidationError('Leave request must span at least one business day');
    }

    const fiscalYear = startDate.getUTCFullYear();

    const balance = await this.leaveBalanceRepo.findByEmployeeAndPolicy(
      dto.employeeId,
      dto.leavePolicyId,
      fiscalYear,
    );

    if (!balance) {
      throw new ValidationError(
        `No leave balance found for employee ${dto.employeeId}, policy ${dto.leavePolicyId}, fiscal year ${fiscalYear}`,
      );
    }

    const remainingDays = balance.totalEntitlement - balance.usedDays;
    if (remainingDays < businessDays) {
      throw new InsufficientBalanceError(
        `Insufficient leave balance: requested ${businessDays} day(s), but only ${remainingDays} day(s) remaining`,
      );
    }

    const newUsedDays = balance.usedDays + businessDays;
    await this.leaveBalanceRepo.updateUsedDays(balance.id, newUsedDays);

    const created = await this.leaveRequestRepo.create(dto);

    const submitted = await this.leaveRequestRepo.updateStatus(
      created.id,
      LeaveRequestStatus.SUBMITTED,
    );

    return submitted;
  }

  async approve(
    leaveRequestId: string,
    approverId: string,
    approverRole: 'manager' | 'hr_admin',
  ): Promise<LeaveRequest> {
    const leaveRequest = await this.leaveRequestRepo.findById(leaveRequestId);
    if (!leaveRequest) {
      throw new LeaveRequestNotFoundError(leaveRequestId);
    }

    if (leaveRequest.status !== LeaveRequestStatus.SUBMITTED) {
      throw new ValidationError(
        `Cannot approve leave request with status ${leaveRequest.status}`,
      );
    }

    const employee = await this.employeeRepo.findById(leaveRequest.employeeId);
    if (!employee) {
      throw new ValidationError(`Employee with id ${leaveRequest.employeeId} not found`);
    }

    if (employee.managerId === null) {
      if (approverRole !== 'hr_admin') {
        throw new ApproverNotAuthorizedError(
          'Employee has no manager; only an HR admin may approve this request',
        );
      }
    } else {
      if (approverId !== employee.managerId) {
        throw new ApproverNotAuthorizedError(
          'Only the employee\'s direct manager may approve this request',
        );
      }
    }

    const approvedAt = new Date();
    const updated = await this.leaveRequestRepo.updateStatus(
      leaveRequestId,
      LeaveRequestStatus.APPROVED,
      approverId,
      approvedAt,
    );

    return updated;
  }

  async reject(
    leaveRequestId: string,
    approverId: string,
    approverRole: 'manager' | 'hr_admin',
  ): Promise<LeaveRequest> {
    const leaveRequest = await this.leaveRequestRepo.findById(leaveRequestId);
    if (!leaveRequest) {
      throw new LeaveRequestNotFoundError(leaveRequestId);
    }

    if (leaveRequest.status !== LeaveRequestStatus.SUBMITTED) {
      throw new ValidationError(
        `Cannot reject leave request with status ${leaveRequest.status}`,
      );
    }

    const employee = await this.employeeRepo.findById(leaveRequest.employeeId);
    if (!employee) {
      throw new ValidationError(`Employee with id ${leaveRequest.employeeId} not found`);
    }

    if (employee.managerId === null) {
      if (approverRole !== 'hr_admin') {
        throw new ApproverNotAuthorizedError(
          'Employee has no manager; only an HR admin may reject this request',
        );
      }
    } else {
      if (approverId !== employee.managerId) {
        throw new ApproverNotAuthorizedError(
          'Only the employee\'s direct manager may reject this request',
        );
      }
    }

    const startDate = new Date(
      Date.UTC(
        leaveRequest.startDate.getUTCFullYear(),
        leaveRequest.startDate.getUTCMonth(),
        leaveRequest.startDate.getUTCDate(),
      ),
    );
    const endDate = new Date(
      Date.UTC(
        leaveRequest.endDate.getUTCFullYear(),
        leaveRequest.endDate.getUTCMonth(),
        leaveRequest.endDate.getUTCDate(),
      ),
    );
    const businessDays = countBusinessDays(startDate, endDate, []);
    const fiscalYear = startDate.getUTCFullYear();

    const balance = await this.leaveBalanceRepo.findByEmployeeAndPolicy(
      leaveRequest.employeeId,
      leaveRequest.leavePolicyId,
      fiscalYear,
    );

    if (balance) {
      const restoredUsedDays = Math.max(0, balance.usedDays - businessDays);
      await this.leaveBalanceRepo.updateUsedDays(balance.id, restoredUsedDays);
    }

    const updated = await this.leaveRequestRepo.updateStatus(
      leaveRequestId,
      LeaveRequestStatus.REJECTED,
      approverId,
      new Date(),
    );

    return updated;
  }

  async cancel(
    leaveRequestId: string,
    actorId: string,
    actorRole: 'employee' | 'manager' | 'hr_admin',
  ): Promise<LeaveRequest> {
    const leaveRequest = await this.leaveRequestRepo.findById(leaveRequestId);
    if (!leaveRequest) {
      throw new LeaveRequestNotFoundError(leaveRequestId);
    }

    if (
      leaveRequest.status !== LeaveRequestStatus.SUBMITTED &&
      leaveRequest.status !== LeaveRequestStatus.APPROVED
    ) {
      throw new ValidationError(
        `Cannot cancel leave request with status ${leaveRequest.status}`,
      );
    }

    if (actorRole === 'employee' && actorId !== leaveRequest.employeeId) {
      throw new ApproverNotAuthorizedError(
        'Employee may only cancel their own leave requests',
      );
    }

    const wasSubmitted = leaveRequest.status === LeaveRequestStatus.SUBMITTED;

    if (wasSubmitted) {
      const startDate = new Date(
        Date.UTC(
          leaveRequest.startDate.getUTCFullYear(),
          leaveRequest.startDate.getUTCMonth(),
          leaveRequest.startDate.getUTCDate(),
        ),
      );
      const endDate = new Date(
        Date.UTC(
          leaveRequest.endDate.getUTCFullYear(),
          leaveRequest.endDate.getUTCMonth(),
          leaveRequest.endDate.getUTCDate(),
        ),
      );
      const businessDays = countBusinessDays(startDate, endDate, []);
      const fiscalYear = startDate.getUTCFullYear();

      const balance = await this.leaveBalanceRepo.findByEmployeeAndPolicy(
        leaveRequest.employeeId,
        leaveRequest.leavePolicyId,
        fiscalYear,
      );

      if (balance) {
        const restoredUsedDays = Math.max(0, balance.usedDays - businessDays);
        await this.leaveBalanceRepo.updateUsedDays(balance.id, restoredUsedDays);
      }
    }

    const updated = await this.leaveRequestRepo.updateStatus(
      leaveRequestId,
      LeaveRequestStatus.CANCELLED,
    );

    return updated;
  }

  async getById(leaveRequestId: string): Promise<LeaveRequest | null> {
    return this.leaveRequestRepo.findById(leaveRequestId);
  }

  async getByEmployee(employeeId: string): Promise<LeaveRequest[]> {
    return this.leaveRequestRepo.findByEmployee(employeeId);
  }
}
