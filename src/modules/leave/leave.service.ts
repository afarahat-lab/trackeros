import { PoolClient } from 'pg';
import {
  AuditAction,
  CreateLeaveRequestDto,
  EmployeeRole,
  LeaveRequestQueryParams,
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
import { IPolicyService, createPolicyService } from '../policy';
import { ILeaveRepository, PgLeaveRequestRepository } from './leave.repository';
import { CreateLeaveRequestInput, LeaveRequest } from './leave.model';
import { startOfUtcDay, addMonths, periodContaining } from '../../shared/date';

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
  cancel(actor: LeaveActor, requestId: string): Promise<LeaveRequest>;
  list(actor: LeaveActor, params: LeaveRequestQueryParams): Promise<LeaveRequest[]>;
  getById(actor: LeaveActor, requestId: string): Promise<LeaveRequest>;
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
      cancelledBy: null,
      cancelledAt: null,
    };

    // The request and its audit record are ONE unit of work. Written separately, a
    // failing audit insert leaves a persisted request with no audit trail, which
    // breaks the platform rule that every state change is audited — and made create
    // the only mutation here that was not transactional.
    return this.uow.withTransaction(async (client) => {
      const created = await this.repository.create(toCreate, client);

      await this.auditService.record(
        {
          actorId: actor.id,
          action: AuditAction.CREATE,
          entityType: 'leave_request',
          entityId: created.id,
          beforeState: null,
          afterState: created,
        },
        client,
      );

      return created;
    });
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
        true, // this transaction writes the balance below — lock the row
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
        true, // this transaction writes the balance below — lock the row
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
        true, // this transaction writes the balance below — lock the row
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

  async cancel(actor: LeaveActor, requestId: string): Promise<LeaveRequest> {
    this.assertAuthenticated(actor);

    const request = await this.getRequest(requestId);
    await this.assertCanCancel(actor, request);
    // Cancellation is only valid strictly before the leave's calendar start day: a
    // startDate of today (or earlier) is blocked, which is what removes any need to
    // pro-rate the released balance.
    if (
      startOfUtcDay(request.startDate).getTime() <= startOfUtcDay(new Date()).getTime()
    ) {
      throw new ConflictError('Leave that has already begun cannot be cancelled');
    }

    return this.uow.withTransaction(async (client) => {
      if (request.status !== LeaveStatus.DRAFT) {
        // DRAFT reserved no balance, so it neither reads nor writes the balance row.
        const balance = await this.resolveBalance(
          request.employeeId,
          request.leaveTypeCode,
          request.startDate,
          client,
          true, // this transaction writes the balance below — lock the row
        );

        if (request.status === LeaveStatus.SUBMITTED) {
          await this.balanceRepository.update(
            balance.id,
            { pendingDays: balance.pendingDays - request.requestedDays },
            client,
          );
        } else {
          // APPROVED — release the full requestedDays back from usedDays (no pro-rating):
          // the timing guard above makes cancellation only possible before the leave starts.
          await this.balanceRepository.update(
            balance.id,
            { usedDays: balance.usedDays - request.requestedDays },
            client,
          );
        }
      }

      const updated = await this.repository.update(
        requestId,
        {
          status: LeaveStatus.CANCELLED,
          cancelledBy: actor.id,
          cancelledAt: new Date(),
        },
        client,
      );

      await this.auditService.record(
        {
          actorId: actor.id,
          action: AuditAction.CANCEL,
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
          title: 'Leave request cancelled',
          message: `Your leave request ${requestId} was cancelled.`,
          relatedEntityType: 'leave_request',
          relatedEntityId: requestId,
        },
        client,
      );

      return updated;
    });
  }

  async list(actor: LeaveActor, params: LeaveRequestQueryParams): Promise<LeaveRequest[]> {
    this.assertAuthenticated(actor);

    const query: LeaveRequestQueryParams = { ...params };
    if (actor.role === EmployeeRole.EMPLOYEE) {
      query.employeeIds = [actor.id];
    } else if (actor.role === EmployeeRole.MANAGER) {
      const reports = await this.employeeService.getEmployeesByManagerId(actor.id);
      query.employeeIds = [actor.id, ...reports.map((e) => e.id)];
    }
    // ADMIN: no employeeIds filter — sees every request.

    return this.repository.findByQuery(query);
  }

  async getById(actor: LeaveActor, requestId: string): Promise<LeaveRequest> {
    this.assertAuthenticated(actor);

    const request = await this.getRequest(requestId);

    if (actor.role === EmployeeRole.ADMIN) {
      return request;
    }

    const visibleIds: string[] = [actor.id];
    if (actor.role === EmployeeRole.MANAGER) {
      const reports = await this.employeeService.getEmployeesByManagerId(actor.id);
      visibleIds.push(...reports.map((e) => e.id));
    }

    if (!visibleIds.includes(request.employeeId)) {
      throw new NotFoundError('Leave request not found');
    }
    return request;
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

  private async assertCanCancel(actor: LeaveActor, request: LeaveRequest): Promise<void> {
    // The owner may cancel their own DRAFT or SUBMITTED request.
    if (actor.id === request.employeeId) {
      if (request.status === LeaveStatus.DRAFT || request.status === LeaveStatus.SUBMITTED) {
        return;
      }
      throw new ForbiddenError('Only the owner may cancel a DRAFT or SUBMITTED request');
    }

    // Otherwise only an APPROVED request may be cancelled, by the direct manager or an ADMIN.
    if (request.status !== LeaveStatus.APPROVED) {
      throw new ForbiddenError('Only the owner may cancel this leave request');
    }

    if (actor.role === EmployeeRole.ADMIN) {
      return;
    }

    if (actor.role !== EmployeeRole.MANAGER) {
      throw new ForbiddenError('Only a MANAGER or ADMIN may cancel an APPROVED request');
    }

    const employee = await this.employeeService.getEmployeeById(request.employeeId);
    if (employee.managerId !== actor.id) {
      throw new ForbiddenError('Canceller must be the requester manager');
    }
  }

  /**
   * `forUpdate` MUST be true whenever the caller goes on to write the balance: the
   * deltas are computed here in application code, so an unlocked read lets two
   * concurrent decisions compute from the same pendingDays and lose one update.
   * Validation-only reads (create) leave it false and take no lock.
   */
  private async resolveBalance(
    employeeId: string,
    leaveTypeCode: LeaveTypeCode,
    date: Date,
    client?: PoolClient,
    forUpdate = false,
  ): Promise<LeaveBalance> {
    const policy = await this.policyService.getPolicyByLeaveTypeCode(leaveTypeCode);
    const employee = await this.employeeService.getEmployeeById(employeeId);

    const period = periodContaining(employee.hireDate, policy.accrualPeriodMonths, date);
    const balance = await this.balanceRepository.findByKey(
      employeeId,
      leaveTypeCode,
      period.start,
      period.end,
      client,
      forUpdate,
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
    createPolicyService(),
    new PgUnitOfWork(),
  );
}
