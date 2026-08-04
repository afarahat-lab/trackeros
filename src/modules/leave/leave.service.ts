import { LeaveRequest, CreateLeaveRequestDto, UpdateLeaveRequestDto, LeaveRequestQueryParams } from './leave.model';
import { ILeaveRepository } from './leave.repository';
import { createLeaveRequestSchema, updateLeaveRequestSchema } from './leave.validation';
import { IBalanceService } from '../balance/balance.service';
import { IAuditService } from '../audit/audit.service';
import { INotificationService } from '../notification/notification.service';
import { IPolicyRepository } from '../policy/policy.repository';
import { IEmployeeRepository } from '../employee/employee.repository';
import { AuthenticatedUser, AuditAction, LeaveStatus } from '../../shared/types/index';

// ── Custom error classes ──────────────────────────────────────────

export class InsufficientBalanceError extends Error {
  constructor(
    public readonly remainingBalance: number,
    public readonly requestedDays: number,
  ) {
    super(
      `Insufficient balance: requested ${requestedDays} days but only ${remainingBalance} remaining`,
    );
    this.name = 'InsufficientBalanceError';
  }
}

export class ApproverNotAuthorizedError extends Error {
  constructor(
    public readonly approverId: string,
    public readonly requiredRole: string,
  ) {
    super(
      `Approver ${approverId} is not authorized: required role is ${requiredRole}`,
    );
    this.name = 'ApproverNotAuthorizedError';
  }
}

export class LeaveRequestNotFoundError extends Error {
  constructor(public readonly leaveRequestId: string) {
    super(`Leave request not found: ${leaveRequestId}`);
    this.name = 'LeaveRequestNotFoundError';
  }
}

export class InvalidStateTransitionError extends Error {
  constructor(
    public readonly currentStatus: string,
    public readonly targetStatus: string,
  ) {
    super(
      `Invalid state transition: cannot go from ${currentStatus} to ${targetStatus}`,
    );
    this.name = 'InvalidStateTransitionError';
  }
}

// ── Service interface ─────────────────────────────────────────────

export interface ILeaveService {
  create(dto: CreateLeaveRequestDto, actor: AuthenticatedUser): Promise<LeaveRequest>;
  update(leaveRequestId: string, dto: UpdateLeaveRequestDto, actor: AuthenticatedUser): Promise<LeaveRequest>;
  submit(leaveRequestId: string, actor: AuthenticatedUser): Promise<LeaveRequest>;
  approve(leaveRequestId: string, approverId: string, approverRole: 'manager' | 'hr_admin'): Promise<LeaveRequest>;
  reject(leaveRequestId: string, approverId: string, approverRole: 'manager' | 'hr_admin', reason?: string): Promise<LeaveRequest>;
  cancel(leaveRequestId: string, actor: AuthenticatedUser): Promise<LeaveRequest>;
  findById(id: string, actor: AuthenticatedUser): Promise<LeaveRequest>;
  findByEmployee(employeeId: string, queryParams: LeaveRequestQueryParams, actor: AuthenticatedUser): Promise<LeaveRequest[]>;
}

// ── Service implementation ────────────────────────────────────────

export class LeaveService implements ILeaveService {
  constructor(
    private readonly leaveRepository: ILeaveRepository,
    private readonly balanceService: IBalanceService,
    private readonly auditService: IAuditService,
    private readonly notificationService: INotificationService,
    private readonly policyRepository: IPolicyRepository,
    private readonly employeeRepository: IEmployeeRepository,
  ) {}

  // ── create ──────────────────────────────────────────────────────

  async create(
    dto: CreateLeaveRequestDto,
    actor: AuthenticatedUser,
  ): Promise<LeaveRequest> {
    // Validate via Zod schema (convert Date → ISO string for validation)
    const validationResult = createLeaveRequestSchema.safeParse({
      employeeId: dto.employeeId,
      leaveTypeId: dto.leaveTypeId,
      startDate: dto.startDate.toISOString(),
      endDate: dto.endDate.toISOString(),
      reason: dto.reason,
    });

    if (!validationResult.success) {
      throw new Error(
        `Validation failed: ${validationResult.error.issues.map((e) => e.message).join('; ')}`,
      );
    }

    // Employee can only create for themselves
    if (actor.id !== dto.employeeId) {
      throw new Error('Employee can only create leave requests for themselves');
    }

    const request = await this.leaveRepository.create(dto);

    // Write audit record
    await this.auditService.record(
      AuditAction.CREATE,
      'leave_request',
      request.id,
      actor.id,
      undefined,
      {
        employeeId: request.employeeId,
        leaveTypeId: request.leaveTypeId,
        startDate: request.startDate.toISOString(),
        endDate: request.endDate.toISOString(),
        reason: request.reason ?? null,
        status: request.status,
      },
    );

    return request;
  }

  // ── update ──────────────────────────────────────────────────────

  async update(
    leaveRequestId: string,
    dto: UpdateLeaveRequestDto,
    actor: AuthenticatedUser,
  ): Promise<LeaveRequest> {
    const request = await this.leaveRepository.findById(leaveRequestId);
    if (!request) {
      throw new LeaveRequestNotFoundError(leaveRequestId);
    }

    // Only DRAFT status allowed
    if (request.status !== LeaveStatus.DRAFT) {
      throw new InvalidStateTransitionError(
        request.status,
        'UPDATE',
      );
    }

    // Only the owning employee can update
    if (actor.id !== request.employeeId) {
      throw new Error('Only the owning employee can update a leave request');
    }

    // Validate dto via Zod partial schema (convert Date → ISO string for validation)
    const validationInput: Record<string, unknown> = {};
    if (dto.startDate !== undefined) {
      validationInput.startDate = dto.startDate.toISOString();
    }
    if (dto.endDate !== undefined) {
      validationInput.endDate = dto.endDate.toISOString();
    }
    if (dto.reason !== undefined) {
      validationInput.reason = dto.reason;
    }

    const validationResult = updateLeaveRequestSchema.safeParse(validationInput);
    if (!validationResult.success) {
      throw new Error(
        `Validation failed: ${validationResult.error.issues.map((e) => e.message).join('; ')}`,
      );
    }

    const oldValues: Record<string, unknown> = {
      startDate: request.startDate.toISOString(),
      endDate: request.endDate.toISOString(),
      reason: request.reason ?? null,
    };

    const updated = await this.leaveRepository.update(leaveRequestId, dto);
    if (!updated) {
      throw new LeaveRequestNotFoundError(leaveRequestId);
    }

    // Write audit record
    await this.auditService.record(
      AuditAction.UPDATE,
      'leave_request',
      leaveRequestId,
      actor.id,
      oldValues,
      {
        startDate: updated.startDate.toISOString(),
        endDate: updated.endDate.toISOString(),
        reason: updated.reason ?? null,
      },
    );

    return updated;
  }

  // ── findById ────────────────────────────────────────────────────

  async findById(id: string, actor: AuthenticatedUser): Promise<LeaveRequest> {
    const request = await this.leaveRepository.findById(id);
    if (!request) {
      throw new LeaveRequestNotFoundError(id);
    }

    await this.enforceRbac(request.employeeId, actor);

    return request;
  }

  // ── findByEmployee ──────────────────────────────────────────────

  async findByEmployee(
    employeeId: string,
    queryParams: LeaveRequestQueryParams,
    actor: AuthenticatedUser,
  ): Promise<LeaveRequest[]> {
    await this.enforceRbac(employeeId, actor);

    return this.leaveRepository.findByEmployee(employeeId, queryParams);
  }

  // ── Stubs (Phase 8b) ────────────────────────────────────────────

  async submit(
    _leaveRequestId: string,
    _actor: AuthenticatedUser,
  ): Promise<LeaveRequest> {
    throw new Error('Not implemented — see Phase 8b');
  }

  async approve(
    _leaveRequestId: string,
    _approverId: string,
    _approverRole: 'manager' | 'hr_admin',
  ): Promise<LeaveRequest> {
    throw new Error('Not implemented — see Phase 8b');
  }

  async reject(
    _leaveRequestId: string,
    _approverId: string,
    _approverRole: 'manager' | 'hr_admin',
    _reason?: string,
  ): Promise<LeaveRequest> {
    throw new Error('Not implemented — see Phase 8b');
  }

  async cancel(
    _leaveRequestId: string,
    _actor: AuthenticatedUser,
  ): Promise<LeaveRequest> {
    throw new Error('Not implemented — see Phase 8b');
  }

  // ── RBAC helper ─────────────────────────────────────────────────

  private async enforceRbac(
    targetEmployeeId: string,
    actor: AuthenticatedUser,
  ): Promise<void> {
    // hr_admin sees all
    if (actor.role === 'hr_admin') {
      return;
    }

    // Employee sees own only
    if (actor.role === 'employee') {
      if (actor.id !== targetEmployeeId) {
        throw new ApproverNotAuthorizedError(actor.id, 'employee or manager or hr_admin');
      }
      return;
    }

    // Manager sees own + direct reports
    if (actor.role === 'manager') {
      if (actor.id === targetEmployeeId) {
        return;
      }

      const employee = await this.employeeRepository.findById(targetEmployeeId);
      if (!employee) {
        throw new LeaveRequestNotFoundError(targetEmployeeId);
      }

      if (employee.managerId === actor.id) {
        return;
      }

      throw new ApproverNotAuthorizedError(actor.id, 'manager of the employee or hr_admin');
    }

    throw new ApproverNotAuthorizedError(actor.id, 'employee or manager or hr_admin');
  }
}
