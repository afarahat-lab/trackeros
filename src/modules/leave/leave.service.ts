import { PoolClient } from 'pg';
import {
  AuditAction,
  CreateLeaveRequestDto,
  EmployeeRole,
  LeaveStatus,
  LeaveTypeCode,
  requestedDays,
} from '../../shared/types';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from '../../shared/errors';
import { IUnitOfWork, PgUnitOfWork } from '../../shared/db';
import { IBalanceRepository, LeaveBalance, PgLeaveBalanceRepository } from '../balance';
import { IAuditService, AuditService, PgAuditLogRepository } from '../audit';
import {
  INotificationService,
  NotificationService,
  PgNotificationRepository,
} from '../notification';
import { IValidationService, ValidationService } from '../validation';
import { IEmployeeService, EmployeeService, PgEmployeeRepository } from '../employee';
import { IPolicyService, PolicyService, PgLeavePolicyRepository } from '../policy';
import { PgLeaveTypeRepository, LeaveTypeService } from '../leave-type';
import { ILeaveRepository, PgLeaveRequestRepository } from './leave.repository';
import { CreateLeaveRequestInput, LeaveRequest } from './leave.model';

/**
 * The authenticated identity passed to every LeaveService operation. The
 * role drives the authorization checks (binding decision: EMPLOYEE | MANAGER | ADMIN).
 */
export interface LeaveActor {
  id: string;
  role: EmployeeRole;
}

export interface ILeaveService {
  create(actor: LeaveActor, input: CreateLeaveRequestDto): Promise<LeaveRequest>;
  submit(actor: LeaveActor, requestId: string): Promise<LeaveRequest>;
  approve(actor: LeaveActor, requestId: string): Promise<LeaveRequest>;
  reject(actor: LeaveActor, requestId: string): Promise<LeaveRequest>;
}

/**
 * Orchestrates the leave-request lifecycle (DRAFT -> SUBMITTED -> APPROVED|REJECTED).
 *
 * The service owns the transaction boundary and delegates all data access to the
 * repository/service interfaces it is constructed with. requestedDays is always the
 * canonical inclusive count from `requestedDays` (src/shared/types) — never re-derived.
 */
export class LeaveService implements ILeaveService {
  constructor(
    private readonly repository: ILeaveRepository,
    private readonly balanceRepository: IBalanceRepository,
    private readonly auditService: IAuditService,
    private readonly notificationService: INotificationService,
    private readonly validationService: IValidationService,
    private readonly employeeService: IEmployeeService,
    private readonly policyService: IPolicyService,
    private readonly uow: IUnitOfWork,
  ) {}

  async create(actor: LeaveActor, input: CreateLeaveRequestDto): Promise<LeaveRequest> {
    this.assertAuthenticated(actor);

    // The requester always owns the request, regardless of any client-supplied id.
    const dto: CreateLeaveRequestDto = { ...input, employeeId: actor.id };

    const balance = await this.resolveBalance(dto.employeeId, dto.leaveTypeCode, dto.startDate);
    this.validationService.validateLeaveRequest(dto, balance);

    const days = requestedDays(dto.startDate, dto.endDate);

    const toCreate: CreateLeaveRequestInput = {
      employeeId: actor.id,
      leaveTypeCode: dto.leaveTypeCode,
      startDate: dto.startDate,
      endDate: dto.endDate,
      requestedDays: days,
      reason: dto.reason ?? null,
      status: LeaveStatus.DRAFT,
      approverId: null,
      approvalComment: null,
      submittedAt: null,
      decidedAt: null,
    };

    const created = await this.repository.create(toCreate);

    await this.auditService.record({
      actorId: actor.id,
      action: AuditAction.CREATE,
      entityType: 'leave_request',
      entityId: created.id,
      beforeState: null,
      afterState: created,
    });

    return created;
  }

  async submit(actor: LeaveActor, requestId: string): Promise<LeaveRequest> {
    this.assertAuthenticated(actor);

    const request = await this.getRequest(requestId);
    if (request.employeeId !== actor.id) {
      throw new ForbiddenError('Only the owner may submit this leave request');
    }
    if (request.status !== LeaveStatus.DRAFT) {
      throw new ConflictError('Only DRAFT requests may be submitted');
    }

    return this.uow.withTransaction(async (client) => {
      const balance = await this.resolveBalance(
        request.employeeId,
        request.leaveTypeCode,
        request.startDate,
        client,
      );

      const updated = await this.repository.update(
        requestId,
        { status: LeaveStatus.SUBMITTED },
        client,
      );

      await this.balanceRepository.update(
        balance.id,
        { pendingDays: balance.pendingDays + request.requestedDays },
        client,
      );

      await this.auditService.record(
        {
          actorId: actor.id,
          action: AuditAction.UPDATE,
          entityType: 'leave_request',
          entityId: requestId,
          beforeState: request,
          afterState: updated,
        },
        client,
      );

      return updated;
    });
  }

  async approve(actor: LeaveActor, requestId: string): Promise<LeaveRequest> {
    this.assertAuthenticated(actor);

    const request = await this.getRequest(requestId);
    await this.assertCanDecide(actor, request);
    if (request.status !== LeaveStatus.SUBMITTED) {
      throw new ConflictError('Only SUBMITTED requests may be approved');
    }

    return this.uow.withTransaction(async (client) => {
      const balance = await this.resolveBalance(
        request.employeeId,
        request.leaveTypeCode,
        request.startDate,
        client,
      );
      this.assertPendingDays(balance, request.requestedDays);

      const updated = await this.repository.update(
        requestId,
        { status: LeaveStatus.APPROVED, approverId: actor.id, decidedAt: new Date() },
        client,
      );

      await this.balanceRepository.update(
        balance.id,
        {
          pendingDays: balance.pendingDays - request.requestedDays,
          usedDays: balance.usedDays + request.requestedDays,
        },
        client,
      );

      await this.auditService.record(
        {
          actorId: actor.id,
          action: AuditAction.APPROVE,
          entityType: 'leave_request',
          entityId: requestId,
          beforeState: request,
          afterState: updated,
        },
        client,
      );

      await this.notificationService.create(
        {
          recipientId: request.employeeId,
          type: 'leave_request',
          title: 'Leave request approved',
          message: `Your leave request ${requestId} was approved.`,
          relatedEntityType: 'leave_request',
          relatedEntityId: requestId,
        },
        client,
      );

      return updated;
    });
  }

  async reject(actor: LeaveActor, requestId: string): Promise<LeaveRequest> {
    this.assertAuthenticated(actor);

    const request = await this.getRequest(requestId);
    await this.assertCanDecide(actor, request);
    if (request.status !== LeaveStatus.SUBMITTED) {
      throw new ConflictError('Only SUBMITTED requests may be rejected');
    }

    return this.uow.withTransaction(async (client) => {
      const balance = await this.resolveBalance(
        request.employeeId,
        request.leaveTypeCode,
        request.startDate,
        client,
      );
      this.assertPendingDays(balance, request.requestedDays);

      const updated = await this.repository.update(
        requestId,
        { status: LeaveStatus.REJECTED, approverId: actor.id, decidedAt: new Date() },
        client,
      );

      await this.balanceRepository.update(
        balance.id,
        { pendingDays: balance.pendingDays - request.requestedDays },
        client,
      );

      await this.auditService.record(
        {
          actorId: actor.id,
          action: AuditAction.REJECT,
          entityType: 'leave_request',
          entityId: requestId,
          beforeState: request,
          afterState: updated,
        },
        client,
      );

      await this.notificationService.create(
        {
          recipientId: request.employeeId,
          type: 'leave_request',
          title: 'Leave request rejected',
          message: `Your leave request ${requestId} was rejected.`,
          relatedEntityType: 'leave_request',
          relatedEntityId: requestId,
        },
        client,
      );

      return updated;
    });
  }

  private async getRequest(requestId: string): Promise<LeaveRequest> {
    const request = await this.repository.findById(requestId);
    if (!request) {
      throw new NotFoundError('Leave request not found');
    }
    return request;
  }

  private assertAuthenticated(actor: LeaveActor): void {
    if (!actor || typeof actor.id !== 'string' || actor.id.trim() === '') {
      throw new UnauthorizedError('Missing actor identity');
    }
    if (!Object.values(EmployeeRole).includes(actor.role)) {
      throw new ForbiddenError('Actor is not an employee');
    }
  }

  private async assertCanDecide(actor: LeaveActor, request: LeaveRequest): Promise<void> {
    if (actor.role !== EmployeeRole.MANAGER && actor.role !== EmployeeRole.ADMIN) {
      throw new ForbiddenError('Only a MANAGER or ADMIN may decide a leave request');
    }
    if (actor.id === request.employeeId) {
      throw new ForbiddenError('Cannot decide your own leave request');
    }
    if (actor.role === EmployeeRole.ADMIN) {
      return;
    }
    // A MANAGER must be the requester's direct manager.
    const employee = await this.employeeService.getEmployeeById(request.employeeId);
    if (employee.managerId !== actor.id) {
      throw new ForbiddenError('Approver must be the requester manager');
    }
  }

  private async resolveBalance(
    employeeId: string,
    leaveTypeCode: LeaveTypeCode,
    date: Date,
    client?: PoolClient,
  ): Promise<LeaveBalance> {
    const policy = await this.policyService.getPolicyByLeaveTypeCode(leaveTypeCode);
    const employee = await this.employeeService.getEmployeeById(employeeId);

    const period = this.periodContaining(employee.hireDate, policy.accrualPeriodMonths, date);
    const balance = await this.balanceRepository.findByKey(
      employeeId,
      leaveTypeCode,
      period.start,
      period.end,
      client,
    );

    if (!balance) {
      throw new NotFoundError('Leave balance not found for the requested period');
    }
    return balance;
  }

  private assertPendingDays(balance: LeaveBalance, days: number): void {
    if (balance.pendingDays < days) {
      throw new ConflictError('Leave balance pendingDays would go negative');
    }
  }

  private periodContaining(
    anchor: Date,
    accrualMonths: number,
    date: Date,
  ): { start: Date; end: Date } {
    if (date.getTime() < anchor.getTime()) {
      throw new ConflictError('Requested date precedes the accrual anchor');
    }

    let start = this.startOfUtcDay(anchor);
    // Safety bound: a finite date always lands within a finite number of periods.
    for (let i = 0; i < 10_000; i += 1) {
      const end = this.addMonths(start, accrualMonths);
      if (date.getTime() >= start.getTime() && date.getTime() < end.getTime()) {
        return { start, end };
      }
      start = end;
    }
    throw new ConflictError('Unable to resolve accrual period');
  }

  private startOfUtcDay(date: Date): Date {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  }

  private addMonths(date: Date, months: number): Date {
    const result = new Date(date.getTime());
    const day = result.getUTCDate();
    result.setUTCDate(1);
    result.setUTCMonth(result.getUTCMonth() + months);
    const lastDay = new Date(
      Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0),
    ).getUTCDate();
    result.setUTCDate(Math.min(day, lastDay));
    return result;
  }
}

/**
 * Convenience factory wiring the concrete PostgreSQL-backed collaborators the
 * routes layer needs so route handlers construct a single service instance.
 */
export function createLeaveService(): ILeaveService {
  return new LeaveService(
    new PgLeaveRequestRepository(),
    new PgLeaveBalanceRepository(),
    new AuditService(new PgAuditLogRepository()),
    new NotificationService(new PgNotificationRepository()),
    new ValidationService(),
    new EmployeeService(new PgEmployeeRepository()),
    new PolicyService(new PgLeavePolicyRepository(), new LeaveTypeService(new PgLeaveTypeRepository())),
    new PgUnitOfWork(),
  );
}
