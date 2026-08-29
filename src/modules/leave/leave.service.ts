import type { PoolClient } from 'pg';
import { randomUUID } from 'crypto';

import { pool } from '../../shared/db/connection';
import {
  AuthorizationError,
  InsufficientBalanceError,
  NotFoundError,
  OverlapError,
  ValidationError
} from '../../shared/types/errors';
import { LeaveRequestStatus, UserRole } from '../../shared/types';
import type { LeaveBalance } from '../balance';
import {
  LeaveRequest,
  SubmitLeaveInput,
  ILeaveRequestRepository,
  ILeaveService,
  LeaveServiceDependencies,
  countLeaveDays
} from './leave.model';
import { PgLeaveRequestRepository } from './leave.repository';
import {
  BalanceService as BalanceServiceImpl,
  PgLeaveBalanceRepository
} from '../balance';
import { AuditService as AuditServiceImpl, PgAuditLogRepository } from '../audit';
import {
  NotificationService as NotificationServiceImpl,
  PgNotificationRepository
} from '../notification';
import { PgEmployeeRepository } from '../employee';
import { PgLeaveTypeRepository } from '../leave-type';
import { PgLeavePolicyRepository } from '../policy';

const ENTITY_TYPE = 'leave_request';

export class LeaveService implements ILeaveService {
  private readonly deps: LeaveServiceDependencies;

  constructor(deps: LeaveServiceDependencies) {
    this.deps = deps;
  }

  async submit(
    input: SubmitLeaveInput,
    actorId: string,
    actorRole: UserRole
  ): Promise<LeaveRequest> {
    if (!input.employeeId || !input.leaveTypeId) {
      throw new ValidationError('employeeId and leaveTypeId are required');
    }
    if (input.startDate > input.endDate) {
      throw new ValidationError('startDate must be on or before endDate');
    }
    this.assertEmployeeRole(actorRole);

    return this.withTransaction(async (client) => {
      const employee = await this.deps.employeeRepository.findById(
        input.employeeId,
        client
      );
      if (!employee) {
        throw new NotFoundError(`Employee ${input.employeeId} not found`);
      }
      const leaveType = await this.deps.leaveTypeRepository.findById(
        input.leaveTypeId,
        client
      );
      if (!leaveType) {
        throw new NotFoundError(`Leave type ${input.leaveTypeId} not found`);
      }

      const n = countLeaveDays(input.startDate, input.endDate);
      if (n < 1) {
        throw new ValidationError('Leave duration must be at least one day');
      }

      const balance = await this.resolveBalance(input, client);
      await this.deps.balanceService.reserve(balance.id, n, client);

      const now = new Date();
      const request: LeaveRequest = {
        id: randomUUID(),
        employeeId: input.employeeId,
        leaveTypeId: input.leaveTypeId,
        startDate: input.startDate,
        endDate: input.endDate,
        reason: input.reason,
        status: LeaveRequestStatus.SUBMITTED,
        approvedBy: null,
        approvedAt: null,
        rejectedBy: null,
        rejectedAt: null,
        rejectionReason: null,
        cancelledBy: null,
        cancelledAt: null,
        createdAt: now,
        updatedAt: now
      };
      const created = await this.deps.leaveRepository.create(request, client);

      await this.deps.auditService.record(
        {
          entityType: ENTITY_TYPE,
          entityId: created.id,
          action: 'SUBMIT',
          oldValues: null,
          newValues: { status: LeaveRequestStatus.SUBMITTED, employeeId: input.employeeId },
          performedBy: actorId
        },
        client
      );

      await this.notify(
        employee.id,
        'LEAVE_REQUEST_SUBMITTED',
        'Leave request submitted',
        `Your leave request from ${input.startDate.toISOString()} to ${input.endDate.toISOString()} was submitted.`,
        created.id,
        client
      );
      if (employee.managerId) {
        await this.notify(
          employee.managerId,
          'LEAVE_REQUEST_SUBMITTED',
          'Leave request requires approval',
          `A leave request from ${employee.firstName} ${employee.lastName} requires your approval.`,
          created.id,
          client
        );
      }

      return created;
    });
  }

  async approve(
    requestId: string,
    actorId: string,
    actorRole: UserRole
  ): Promise<LeaveRequest> {
    this.assertManagerRole(actorRole);

    return this.withTransaction(async (client) => {
      const request = await this.deps.leaveRepository.findById(requestId, client);
      if (!request) {
        throw new NotFoundError(`Leave request ${requestId} not found`);
      }
      if (actorId === request.employeeId) {
        throw new AuthorizationError('Cannot approve your own leave request');
      }
      if (request.status !== LeaveRequestStatus.SUBMITTED) {
        throw new ValidationError(
          `Cannot approve a ${request.status} leave request`
        );
      }

      const n = countLeaveDays(request.startDate, request.endDate);
      const balance = await this.resolveBalance(request, client);

      const available = this.deps.balanceService.getAvailableDays(balance);
      if (n > available) {
        throw new InsufficientBalanceError(
          `Cannot approve ${n} days; only ${available} available`
        );
      }

      const overlaps = await this.deps.leaveRepository.findOverlappingApproved(
        request.employeeId,
        request.startDate,
        request.endDate,
        client
      );
      if (overlaps.some((r) => r.id !== request.id)) {
        throw new OverlapError(
          'Leave request overlaps an existing approved request'
        );
      }

      await this.deps.balanceService.approve(balance.id, n, client);

      const now = new Date();
      const updated: LeaveRequest = {
        ...request,
        status: LeaveRequestStatus.APPROVED,
        approvedBy: actorId,
        approvedAt: now,
        updatedAt: now
      };
      const saved = await this.deps.leaveRepository.update(updated, client);

      await this.deps.auditService.record(
        {
          entityType: ENTITY_TYPE,
          entityId: saved.id,
          action: 'APPROVE',
          oldValues: { status: LeaveRequestStatus.SUBMITTED },
          newValues: { status: LeaveRequestStatus.APPROVED, approvedBy: actorId },
          performedBy: actorId
        },
        client
      );

      await this.notify(
        request.employeeId,
        'LEAVE_REQUEST_APPROVED',
        'Leave request approved',
        `Your leave request was approved.`,
        saved.id,
        client
      );

      return saved;
    });
  }

  async reject(
    requestId: string,
    actorId: string,
    actorRole: UserRole,
    rejectionReason?: string
  ): Promise<LeaveRequest> {
    this.assertManagerRole(actorRole);

    return this.withTransaction(async (client) => {
      const request = await this.deps.leaveRepository.findById(requestId, client);
      if (!request) {
        throw new NotFoundError(`Leave request ${requestId} not found`);
      }
      if (request.status !== LeaveRequestStatus.SUBMITTED) {
        throw new ValidationError(
          `Cannot reject a ${request.status} leave request`
        );
      }

      const n = countLeaveDays(request.startDate, request.endDate);
      const balance = await this.resolveBalance(request, client);
      await this.deps.balanceService.reject(balance.id, n, client);

      const now = new Date();
      const updated: LeaveRequest = {
        ...request,
        status: LeaveRequestStatus.REJECTED,
        rejectedBy: actorId,
        rejectedAt: now,
        rejectionReason: rejectionReason ?? null,
        updatedAt: now
      };
      const saved = await this.deps.leaveRepository.update(updated, client);

      await this.deps.auditService.record(
        {
          entityType: ENTITY_TYPE,
          entityId: saved.id,
          action: 'REJECT',
          oldValues: { status: LeaveRequestStatus.SUBMITTED },
          newValues: { status: LeaveRequestStatus.REJECTED, rejectedBy: actorId },
          performedBy: actorId
        },
        client
      );

      await this.notify(
        request.employeeId,
        'LEAVE_REQUEST_REJECTED',
        'Leave request rejected',
        rejectionReason
          ? `Your leave request was rejected: ${rejectionReason}`
          : 'Your leave request was rejected.',
        saved.id,
        client
      );

      return saved;
    });
  }

  async cancel(
    requestId: string,
    actorId: string,
    actorRole: UserRole
  ): Promise<LeaveRequest> {
    return this.withTransaction(async (client) => {
      const request = await this.deps.leaveRepository.findById(requestId, client);
      if (!request) {
        throw new NotFoundError(`Leave request ${requestId} not found`);
      }
      if (actorId !== request.employeeId) {
        throw new AuthorizationError('Only the owner can cancel a leave request');
      }
      this.assertEmployeeRole(actorRole);
      if (
        request.status !== LeaveRequestStatus.SUBMITTED &&
        request.status !== LeaveRequestStatus.APPROVED
      ) {
        throw new ValidationError(
          `Cannot cancel a ${request.status} leave request`
        );
      }

      const n = countLeaveDays(request.startDate, request.endDate);
      const balance = await this.resolveBalance(request, client);
      const requestStatus =
        request.status === LeaveRequestStatus.APPROVED ? 'APPROVED' : 'PENDING';
      await this.deps.balanceService.cancel(
        balance.id,
        n,
        requestStatus,
        client
      );

      const now = new Date();
      const updated: LeaveRequest = {
        ...request,
        status: LeaveRequestStatus.CANCELLED,
        cancelledBy: actorId,
        cancelledAt: now,
        updatedAt: now
      };
      const saved = await this.deps.leaveRepository.update(updated, client);

      await this.deps.auditService.record(
        {
          entityType: ENTITY_TYPE,
          entityId: saved.id,
          action: 'CANCEL',
          oldValues: { status: request.status },
          newValues: { status: LeaveRequestStatus.CANCELLED, cancelledBy: actorId },
          performedBy: actorId
        },
        client
      );

      await this.notify(
        request.employeeId,
        'LEAVE_REQUEST_CANCELLED',
        'Leave request cancelled',
        'Your leave request was cancelled.',
        saved.id,
        client
      );

      return saved;
    });
  }

  private assertEmployeeRole(actorRole: UserRole): void {
    if (actorRole !== UserRole.EMPLOYEE) {
      throw new AuthorizationError('Only employees may perform this action');
    }
  }

  private assertManagerRole(actorRole: UserRole): void {
    if (actorRole !== UserRole.MANAGER && actorRole !== UserRole.HR_ADMIN) {
      throw new AuthorizationError('Only managers or HR admins may perform this action');
    }
  }

  private async resolveBalance(
    input: { employeeId: string; leaveTypeId: string; startDate: Date },
    client: PoolClient
  ): Promise<LeaveBalance> {
    const policies = await this.deps.policyRepository.findByLeaveTypeId(
      input.leaveTypeId,
      client
    );
    const policy = policies.find((p) => p.isActive) ?? policies[0];
    if (!policy) {
      throw new NotFoundError(`No leave policy for leave type ${input.leaveTypeId}`);
    }
    // Binding rule 4: the balance year is derived from startDate, once.
    const year = input.startDate.getFullYear();
    let balance = await this.deps.balanceRepository.findByEmployeePolicyAndYear(
      input.employeeId,
      policy.id,
      year,
      client
    );
    if (!balance) {
      balance = await this.deps.balanceRepository.create(
        {
          id: randomUUID(),
          employeeId: input.employeeId,
          policyId: policy.id,
          fiscalYear: year,
          totalEntitlement: policy.entitlementDays,
          usedDays: 0,
          pendingDays: 0,
          remainingDays: policy.entitlementDays,
          status: 'ACTIVE',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        client
      );
    }
    return balance;
  }

  private async notify(
    recipientId: string,
    type: string,
    title: string,
    message: string,
    relatedEntityId: string,
    client: PoolClient
  ): Promise<void> {
    await this.deps.notificationService.notify(
      {
        recipientId,
        type,
        title,
        message,
        relatedEntityType: ENTITY_TYPE,
        relatedEntityId
      },
      client
    );
  }

  private async withTransaction<T>(
    fn: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // ignore rollback failure; the original error is more relevant
      }
      throw err;
    } finally {
      client.release();
    }
  }
}

export function createDefaultLeaveService(): LeaveService {
  return new LeaveService({
    leaveRepository: new PgLeaveRequestRepository(),
    balanceRepository: new PgLeaveBalanceRepository(),
    balanceService: new BalanceServiceImpl(new PgLeaveBalanceRepository()),
    auditService: new AuditServiceImpl(new PgAuditLogRepository()),
    notificationService: new NotificationServiceImpl(
      new PgNotificationRepository()
    ),
    employeeRepository: new PgEmployeeRepository(),
    leaveTypeRepository: new PgLeaveTypeRepository(),
    policyRepository: new PgLeavePolicyRepository()
  });
}
