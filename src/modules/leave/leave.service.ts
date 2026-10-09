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
import { IAuditService, AuditLog, AuditService, PgAuditLogRepository } from '../audit';
import {
  CreateNotificationInput,
  INotificationService,
  NotificationService,
  PgNotificationRepository,
} from '../notification';
import { IValidationService, ValidationService } from '../validation';
import { IEmployeeService, EmployeeService, PgEmployeeRepository } from '../employee';
import { IPolicyService, createPolicyService } from '../policy';
import { ILeaveRepository, PgLeaveRequestRepository } from './leave.repository';
import { CreateLeaveRequestInput, LeaveRequest, PendingDecision } from './leave.model';
import { LEAVE_REQUEST_ENTITY_TYPE } from '../../shared/types';
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
  listPendingDecisions(actor: LeaveActor): Promise<PendingDecision[]>;
  getById(actor: LeaveActor, requestId: string): Promise<LeaveRequest>;
  getHistory(actor: LeaveActor, requestId: string): Promise<AuditLog[]>;
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
      reversesRequestId: null,
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
          entityType: LEAVE_REQUEST_ENTITY_TYPE,
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
          entityType: LEAVE_REQUEST_ENTITY_TYPE,
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
          entityType: LEAVE_REQUEST_ENTITY_TYPE,
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
          entityType: LEAVE_REQUEST_ENTITY_TYPE,
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

    // Recipient resolution reads the employee, not the transaction, so it happens
    // before the unit of work opens (getEmployeeById takes no client). A null
    // recipient is never fatal: the notification set is a function of the state
    // change, and a missing approver only suppresses the second notification.
    const approverRecipient = await this.resolveApproverRecipient(request);
    const approverNotificationSkipped =
      approverRecipient === null &&
      (request.status === LeaveStatus.SUBMITTED || request.status === LeaveStatus.APPROVED);

    // OWNER DECISION (amended): notify every recipient EXCEPT the actor who performed the
    // cancellation. The notification set is still a function of the state change — the actor only
    // removes themselves from it, because telling someone about their own action is noise.
    //
    // Expressed as a SET MINUS rather than two conditionals at the two call sites. The set is the
    // rule; a conditional per site is the rule written twice, and this method already has two
    // notification sites (the GP-008 reversal path and the in-place update) that must not drift.
    // Deduplicated by recipient id, so a requester who is also the recorded approver is notified
    // once, not twice.
    const cancellationNotices = this.cancellationRecipients(
      actor,
      request,
      requestId,
      approverRecipient,
    );

    return this.uow.withTransaction(async (client) => {
      const now = new Date();

      if (request.status === LeaveStatus.APPROVED) {
        // GP-008: a completed approval is IMMUTABLE — its status, approverId,
        // approvalComment and decidedAt are never written again. Cancelling it instead
        // inserts a NEW reversal row (the reversal role of LeaveRequest) that carries
        // the full request shape verbatim, is terminal, and releases the original's
        // requestedDays from usedDays exactly once.
        const existingReversal = await this.repository.findByReversesRequestId(
          request.id,
          client,
        );
        if (existingReversal) {
          throw new ConflictError('This leave request has already been reversed');
        }

        const balance = await this.resolveBalance(
          request.employeeId,
          request.leaveTypeCode,
          request.startDate,
          client,
          true, // this transaction writes the balance below — lock the row
        );

        await this.balanceRepository.update(
          balance.id,
          { usedDays: balance.usedDays - request.requestedDays },
          client,
        );

        // The reversal was never approved: approverId/approvalComment/submittedAt/
        // decidedAt are null so it can never read as a second approval decision.
        const reversal = await this.repository.create(
          {
            employeeId: request.employeeId,
            leaveTypeCode: request.leaveTypeCode,
            startDate: request.startDate,
            endDate: request.endDate,
            requestedDays: request.requestedDays,
            reason: request.reason,
            status: LeaveStatus.CANCELLED,
            approverId: null,
            approvalComment: null,
            submittedAt: null,
            decidedAt: null,
            cancelledBy: actor.id,
            cancelledAt: now,
            reversesRequestId: request.id,
          },
          client,
        );

        await this.auditService.record(
          {
            actorId: actor.id,
            action: AuditAction.CANCEL,
            entityType: LEAVE_REQUEST_ENTITY_TYPE,
            entityId: request.id,
            beforeState: request,
            afterState: approverNotificationSkipped
              ? { ...reversal, approverNotificationSkipped: true }
              : reversal,
          },
          client,
        );

        // GP-008: the reversal row carries a null approverId by construction, so the approver
        // recipient was read from the ORIGINAL row and every notice is keyed to the ORIGINAL
        // request id — never the reversal row's id.
        for (const notice of cancellationNotices) {
          await this.notificationService.create(notice, client);
        }

        return reversal;
      }

      // DRAFT and SUBMITTED have no completed approval, so GP-008 does not apply and
      // the row is cancelled in place.
      if (request.status === LeaveStatus.SUBMITTED) {
        // DRAFT reserved no balance, so it neither reads nor writes the balance row.
        const balance = await this.resolveBalance(
          request.employeeId,
          request.leaveTypeCode,
          request.startDate,
          client,
          true, // this transaction writes the balance below — lock the row
        );

        await this.balanceRepository.update(
          balance.id,
          { pendingDays: balance.pendingDays - request.requestedDays },
          client,
        );
      }

      const updated = await this.repository.update(
        requestId,
        {
          status: LeaveStatus.CANCELLED,
          cancelledBy: actor.id,
          cancelledAt: now,
        },
        client,
      );

      await this.auditService.record(
        {
          actorId: actor.id,
          action: AuditAction.CANCEL,
          entityType: LEAVE_REQUEST_ENTITY_TYPE,
          entityId: requestId,
          beforeState: request,
          afterState: approverNotificationSkipped
            ? { ...updated, approverNotificationSkipped: true }
            : updated,
        },
        client,
      );

      // DRAFT notifies nobody else, matching the rule that a DRAFT cancellation
      // touches no balance. SUBMITTED notifies the requester's direct manager — minus the actor.
      for (const notice of cancellationNotices) {
        await this.notificationService.create(notice, client);
      }

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

  async listPendingDecisions(actor: LeaveActor): Promise<PendingDecision[]> {
    this.assertAuthenticated(actor);

    // The queue is a status-filtered read of the SAME role-scoped visibility rule
    // `list` applies, so it mirrors `list`'s branch rather than restating it. The
    // repository owns the SUBMITTED-only predicate and the start_date ASC order.
    let employeeIds: string[] | undefined;
    if (actor.role === EmployeeRole.EMPLOYEE) {
      employeeIds = [actor.id];
    } else if (actor.role === EmployeeRole.MANAGER) {
      const reports = await this.employeeService.getEmployeesByManagerId(actor.id);
      employeeIds = [actor.id, ...reports.map((e) => e.id)];
    }
    // ADMIN: no employeeIds filter — sees every pending decision.

    return this.repository.findPendingDecisions(employeeIds);
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

  async getHistory(actor: LeaveActor, requestId: string): Promise<AuditLog[]> {
    // getById is the single owner of the leave visibility rule: a caller who may
    // not see the request gets its NotFoundError (indistinguishable from a
    // nonexistent id). A visible request with no entries is a valid empty array.
    await this.getById(actor, requestId);
    return this.auditService.getByEntity(LEAVE_REQUEST_ENTITY_TYPE, requestId);
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
   * Every cancellation notice to send, one per recipient, EXCLUDING the actor.
   *
   * OWNER DECISION (amended 2026-10-09): "notify every recipient except the actor who performed
   * the cancellation". The previous rule was "always notify, even when actor === recipient", and
   * the reason it changed is the one the original question raised: a user receiving a notification
   * about their own action is noise, and the overwhelmingly common cancellation is the requester
   * cancelling their own request — so under the old rule almost every cancellation sent the
   * requester a notice about something they had just done themselves.
   *
   * PURE, and the set is built ONCE for both write paths (the GP-008 reversal and the in-place
   * update). Those paths differ in which row they write, never in who hears about it, and a rule
   * expressed at each site separately is a rule that drifts the first time one site changes.
   *
   * Deduplicated by recipient id: a requester who is also the recorded approver hears once.
   * `null` recipients are dropped here rather than guarded at the call sites — a DRAFT, a
   * SUBMITTED request whose requester has no direct manager, and an APPROVED request with a null
   * approverId all mean "nobody to notify", which is a legal outcome and never fatal.
   */
  private cancellationRecipients(
    actor: LeaveActor,
    request: LeaveRequest,
    requestId: string,
    approverRecipient: string | null,
  ): CreateNotificationInput[] {
    const notices: CreateNotificationInput[] = [
      {
        recipientId: request.employeeId,
        type: 'leave_request',
        title: 'Leave request cancelled',
        message: `Your leave request ${requestId} was cancelled.`,
        relatedEntityType: 'leave_request',
        relatedEntityId: requestId,
      },
    ];
    if (approverRecipient !== null) {
      notices.push({
        recipientId: approverRecipient,
        type: 'leave_request',
        title: 'Leave request cancelled',
        message: `Leave request ${requestId} (${request.leaveTypeCode}) was cancelled.`,
        relatedEntityType: 'leave_request',
        relatedEntityId: requestId,
        relatedEntityCode: request.leaveTypeCode,
      });
    }

    const seen = new Set<string>();
    return notices.filter((notice) => {
      if (notice.recipientId === actor.id) {
        return false;
      }
      if (seen.has(notice.recipientId)) {
        return false;
      }
      seen.add(notice.recipientId);
      return true;
    });
  }

  /**
   * The recipient of the approver-side cancellation notification. Reads the
   * employee record (never the transaction: getEmployeeById takes no client) and
   * returns null rather than throwing when there is nobody to notify — a DRAFT,
   * a SUBMITTED request whose requester has no direct manager, or an APPROVED
   * request with a null approverId (a known, reachable legacy state).
   */
  private async resolveApproverRecipient(request: LeaveRequest): Promise<string | null> {
    if (request.status === LeaveStatus.APPROVED) {
      return request.approverId;
    }
    if (request.status === LeaveStatus.SUBMITTED) {
      const employee = await this.employeeService.getEmployeeById(request.employeeId);
      return employee.managerId;
    }
    return null;
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
