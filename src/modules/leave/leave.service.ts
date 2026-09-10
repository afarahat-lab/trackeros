import { PoolClient } from 'pg';
import {
  LeaveStatus,
  LeaveTypeCode,
  CreateLeaveRequestDto,
  LeaveRequestQueryParams,
  AuditAction,
  EmployeeRole,
  requestedDays,
} from '../../shared/types';
import {
  ValidationError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
} from '../../shared/errors';
import { IUnitOfWork } from '../../shared/db';
import { IBalanceRepository, LeaveBalance } from '../balance';
import { IAuditService } from '../audit';
import { INotificationService } from '../notification';
import { IEmployeeService } from '../employee';
import { IValidationService } from '../validation';
import { LeaveRequest, CreateLeaveRequestInput } from './leave.model';
import { ILeaveRepository } from './leave.repository';

export interface ILeaveService {
  create(dto: CreateLeaveRequestDto): Promise<LeaveRequest>;
  submit(id: string): Promise<LeaveRequest>;
  approve(id: string, approverId: string, approvalComment?: string): Promise<LeaveRequest>;
  reject(id: string, approverId: string, approvalComment?: string): Promise<LeaveRequest>;
  getById(id: string): Promise<LeaveRequest>;
  list(params: LeaveRequestQueryParams): Promise<LeaveRequest[]>;
}

export class LeaveService implements ILeaveService {
  constructor(
    private readonly repository: ILeaveRepository,
    private readonly balanceRepository: IBalanceRepository,
    private readonly auditService: IAuditService,
    private readonly notificationService: INotificationService,
    private readonly employeeService: IEmployeeService,
    private readonly validationService: IValidationService,
    private readonly uow: IUnitOfWork,
  ) {}

  async create(dto: CreateLeaveRequestDto): Promise<LeaveRequest> {
    this.validateCreateDto(dto);

    const balance = await this.resolveBalance(dto.employeeId, dto.leaveTypeCode, dto.startDate);
    this.validationService.validateLeaveRequest(dto, balance);

    const days = requestedDays(dto.startDate, dto.endDate);
    const input: CreateLeaveRequestInput = {
      employeeId: dto.employeeId,
      leaveTypeCode: dto.leaveTypeCode,
      startDate: dto.startDate,
      endDate: dto.endDate,
      requestedDays: days,
      reason: dto.reason ?? null,
    };

    return this.uow.withTransaction(async (client) => {
      const created = await this.repository.create(input, client);
      await this.auditService.record(
        {
          actorId: dto.employeeId,
          action: AuditAction.CREATE,
          entityType: 'leave_request',
          entityId: created.id,
          beforeState: null,
          afterState: this.toPreview(created),
        },
        client,
      );
      return created;
    });
  }

  async submit(id: string): Promise<LeaveRequest> {
    this.assertId(id);

    return this.uow.withTransaction(async (client) => {
      const request = await this.getRequired(id, client);
      if (request.status !== LeaveStatus.DRAFT) {
        throw new ConflictError('Only DRAFT leave requests can be submitted');
      }

      const balance = await this.resolveBalance(
        request.employeeId,
        request.leaveTypeCode,
        request.startDate,
        client,
      );
      await this.balanceRepository.update(
        balance.id,
        { pendingDays: balance.pendingDays + request.requestedDays },
        client,
      );

      const updated = await this.repository.update(
        id,
        { status: LeaveStatus.SUBMITTED, submittedAt: new Date() },
        client,
      );

      await this.auditService.record(
        {
          actorId: request.employeeId,
          action: AuditAction.UPDATE,
          entityType: 'leave_request',
          entityId: id,
          beforeState: this.toPreview(request),
          afterState: this.toPreview(updated),
        },
        client,
      );

      return updated;
    });
  }

  async approve(id: string, approverId: string, approvalComment?: string): Promise<LeaveRequest> {
    return this.decide(id, approverId, LeaveStatus.APPROVED, approvalComment);
  }

  async reject(id: string, approverId: string, approvalComment?: string): Promise<LeaveRequest> {
    return this.decide(id, approverId, LeaveStatus.REJECTED, approvalComment);
  }

  async getById(id: string): Promise<LeaveRequest> {
    this.assertId(id);
    return this.getRequired(id);
  }

  async list(params: LeaveRequestQueryParams): Promise<LeaveRequest[]> {
    return this.repository.findAll(params);
  }

  private async decide(
    id: string,
    approverId: string,
    targetStatus: LeaveStatus.APPROVED | LeaveStatus.REJECTED,
    approvalComment?: string,
  ): Promise<LeaveRequest> {
    this.assertId(id);
    this.validateActor(approverId, 'approverId');

    // The APPROVE/REJECT contract is atomic: status change + balance update +
    // audit log insert + synchronous notification insert all run in one tx.
    return this.uow.withTransaction(async (client) => {
      const request = await this.getRequired(id, client);
      if (request.status !== LeaveStatus.SUBMITTED) {
        throw new ConflictError('Only SUBMITTED leave requests can be decided');
      }
      if (request.employeeId === approverId) {
        throw new ForbiddenError('Approver cannot approve their own leave request');
      }

      const [approver, requester] = await Promise.all([
        this.employeeService.getEmployeeById(approverId),
        this.employeeService.getEmployeeById(request.employeeId),
      ]);
      const isAdmin = approver.role === EmployeeRole.ADMIN;
      const isManager =
        requester.managerId !== null && requester.managerId === approver.id;
      if (!isAdmin && !isManager) {
        throw new ForbiddenError('Approver is not authorized for this request');
      }

      const balance = await this.resolveBalance(
        request.employeeId,
        request.leaveTypeCode,
        request.startDate,
        client,
      );

      const days = request.requestedDays;
      if (targetStatus === LeaveStatus.APPROVED) {
        await this.balanceRepository.update(
          balance.id,
          {
            usedDays: balance.usedDays + days,
            pendingDays: Math.max(0, balance.pendingDays - days),
          },
          client,
        );
      } else {
        await this.balanceRepository.update(
          balance.id,
          { pendingDays: Math.max(0, balance.pendingDays - days) },
          client,
        );
      }

      const updated = await this.repository.update(
        id,
        {
          status: targetStatus,
          approverId,
          approvalComment: approvalComment ?? null,
          decidedAt: new Date(),
        },
        client,
      );

      await this.auditService.record(
        {
          actorId: approverId,
          action:
            targetStatus === LeaveStatus.APPROVED ? AuditAction.APPROVE : AuditAction.REJECT,
          entityType: 'leave_request',
          entityId: id,
          beforeState: this.toPreview(request),
          afterState: this.toPreview(updated),
        },
        client,
      );

      await this.notificationService.create(
        {
          recipientId: request.employeeId,
          type: 'leave_decision',
          title: targetStatus === LeaveStatus.APPROVED ? 'Leave approved' : 'Leave rejected',
          message:
            targetStatus === LeaveStatus.APPROVED
              ? `Your leave request (${request.requestedDays} day(s)) was approved.`
              : `Your leave request (${request.requestedDays} day(s)) was rejected.`,
          relatedEntityType: 'leave_request',
          relatedEntityId: id,
        },
        client,
      );

      return updated;
    });
  }

  private async getRequired(id: string, client?: PoolClient): Promise<LeaveRequest> {
    const request = await this.repository.findById(id, client);
    if (!request) {
      throw new NotFoundError('Leave request not found');
    }
    return request;
  }

  private async resolveBalance(
    employeeId: string,
    leaveTypeCode: LeaveTypeCode,
    referenceDate: Date,
    client?: PoolClient,
  ): Promise<LeaveBalance> {
    const { periodStart, periodEnd } = this.computeAnnualPeriod(referenceDate);
    const balance = await this.balanceRepository.findByKey(
      employeeId,
      leaveTypeCode,
      periodStart,
      periodEnd,
      client,
    );
    if (!balance) {
      throw new NotFoundError('Leave balance not found');
    }
    return balance;
  }

  /** Annual accrual period is a calendar year (Jan 1 – Dec 31). */
  private computeAnnualPeriod(referenceDate: Date): {
    periodStart: Date;
    periodEnd: Date;
  } {
    const year = referenceDate.getUTCFullYear();
    return {
      periodStart: new Date(Date.UTC(year, 0, 1)),
      periodEnd: new Date(Date.UTC(year, 11, 31)),
    };
  }

  private validateCreateDto(dto: CreateLeaveRequestDto): void {
    if (!dto || typeof dto !== 'object') {
      throw new ValidationError('Leave request is required');
    }
    if (typeof dto.employeeId !== 'string' || dto.employeeId.trim() === '') {
      throw new ValidationError('Invalid employeeId');
    }
    if (!Object.values(LeaveTypeCode).includes(dto.leaveTypeCode)) {
      throw new ValidationError('Invalid leaveTypeCode');
    }
    if (!(dto.startDate instanceof Date) || Number.isNaN(dto.startDate.getTime())) {
      throw new ValidationError('Invalid startDate');
    }
    if (!(dto.endDate instanceof Date) || Number.isNaN(dto.endDate.getTime())) {
      throw new ValidationError('Invalid endDate');
    }
  }

  private validateActor(actorId: string, label: string): void {
    if (typeof actorId !== 'string' || actorId.trim() === '') {
      throw new ValidationError(`Invalid ${label}`);
    }
  }

  private assertId(id: string): void {
    if (typeof id !== 'string' || id.trim() === '') {
      throw new ValidationError('Invalid leave request id');
    }
  }

  private toPreview(request: LeaveRequest): Record<string, unknown> {
    return {
      id: request.id,
      status: request.status,
      approverId: request.approverId,
      decidedAt: request.decidedAt,
    };
  }
}
