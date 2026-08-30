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

import { IAuditService, AuditService } from '../audit';
import { IBalanceService, BalanceService, ILeaveBalanceRepository, PgLeaveBalanceRepository, LeaveBalance } from '../balance';
import { IEmployeeRepository, PgEmployeeRepository } from '../employee';
import { ILeaveTypeRepository, PgLeaveTypeRepository } from '../leave-type';
import { INotificationService, NotificationService } from '../notification';
import { ILeavePolicyRepository, PgLeavePolicyRepository, LeavePolicy } from '../policy';

import {
  ILeaveRequestRepository,
  ILeaveService,
  LeaveRequest,
  countLeaveDays
} from './leave.model';
import { PgLeaveRequestRepository } from './leave.repository';

const ENTITY_TYPE = 'LeaveRequest';

export class LeaveService implements ILeaveService {
  private readonly requestRepository: ILeaveRequestRepository;
  private readonly balanceService: IBalanceService;
  private readonly balanceRepository: ILeaveBalanceRepository;
  private readonly employeeRepository: IEmployeeRepository;
  private readonly leaveTypeRepository: ILeaveTypeRepository;
  private readonly policyRepository: ILeavePolicyRepository;
  private readonly auditService: IAuditService;
  private readonly notificationService: INotificationService;

  constructor(
    requestRepository: ILeaveRequestRepository = new PgLeaveRequestRepository(),
    balanceService: IBalanceService = new BalanceService(),
    balanceRepository: ILeaveBalanceRepository = new PgLeaveBalanceRepository(),
    employeeRepository: IEmployeeRepository = new PgEmployeeRepository(),
    leaveTypeRepository: ILeaveTypeRepository = new PgLeaveTypeRepository(),
    policyRepository: ILeavePolicyRepository = new PgLeavePolicyRepository(),
    auditService: IAuditService = new AuditService(),
    notificationService: INotificationService = new NotificationService()
  ) {
    this.requestRepository = requestRepository;
    this.balanceService = balanceService;
    this.balanceRepository = balanceRepository;
    this.employeeRepository = employeeRepository;
    this.leaveTypeRepository = leaveTypeRepository;
    this.policyRepository = policyRepository;
    this.auditService = auditService;
    this.notificationService = notificationService;
  }

  async submit(
    employeeId: string,
    leaveTypeId: string,
    startDate: Date,
    endDate: Date,
    reason: string | undefined,
    actorId: string,
    client?: PoolClient
  ): Promise<LeaveRequest> {
    if (actorId !== employeeId) {
      throw new ValidationError('actorId must match the request employeeId');
    }
    if (!leaveTypeId) {
      throw new ValidationError('leaveTypeId is required');
    }
    if (!(startDate instanceof Date) || Number.isNaN(startDate.getTime())) {
      throw new ValidationError('startDate must be a valid date');
    }
    if (!(endDate instanceof Date) || Number.isNaN(endDate.getTime())) {
      throw new ValidationError('endDate must be a valid date');
    }
    if (endDate.getTime() < startDate.getTime()) {
      throw new ValidationError('endDate must be on or after startDate');
    }

    return this.withClient(client, async (c) => {
      const employee = await this.employeeRepository.findById(employeeId, c);
      if (!employee) {
        throw new NotFoundError(`Employee ${employeeId} not found`);
      }
      const leaveType = await this.leaveTypeRepository.findById(leaveTypeId, c);
      if (!leaveType) {
        throw new NotFoundError(`Leave type ${leaveTypeId} not found`);
      }
      const policy = await this.getPolicy(leaveTypeId, c);
      const year = startDate.getFullYear();

      const n = countLeaveDays(startDate, endDate);
      const balance = await this.ensureBalance(employeeId, policy, year, c);

      await this.balanceService.reserve(balance.id, n, c);

      const now = new Date();
      const request: LeaveRequest = {
        id: randomUUID(),
        employeeId,
        leaveTypeId,
        startDate,
        endDate,
        reason,
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
      const created = await this.requestRepository.create(request, c);

      await this.auditService.record(
        {
          entityType: ENTITY_TYPE,
          entityId: created.id,
          action: 'SUBMIT',
          oldValues: null,
          newValues: {
            status: LeaveRequestStatus.SUBMITTED,
            employeeId,
            leaveTypeId,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString()
          },
          performedBy: actorId
        },
        c
      );

      if (employee.managerId) {
        await this.notificationService.notify(
          {
            recipientId: employee.managerId,
            type: 'LEAVE_SUBMITTED',
            title: 'Leave request submitted',
            message: `Employee ${employeeId} submitted a ${n}-day leave request`,
            relatedEntityType: ENTITY_TYPE,
            relatedEntityId: created.id
          },
          c
        );
      }

      return created;
    });
  }

  async approve(
    requestId: string,
    actorId: string,
    client?: PoolClient
  ): Promise<LeaveRequest> {
    return this.withClient(client, async (c) => {
      const request = await this.requestRepository.findById(requestId, c);
      if (!request) {
        throw new NotFoundError(`Leave request ${requestId} not found`);
      }
      if (request.status !== LeaveRequestStatus.SUBMITTED) {
        throw new ValidationError('Only SUBMITTED requests can be approved');
      }
      if (request.employeeId === actorId) {
        throw new AuthorizationError('Cannot approve your own leave request');
      }

      const n = countLeaveDays(request.startDate, request.endDate);
      const policy = await this.getPolicy(request.leaveTypeId, c);
      const year = request.startDate.getFullYear();
      const balance = await this.findBalance(request.employeeId, policy.id, year, c);
      if (!balance) {
        throw new NotFoundError(
          `No balance found for employee ${request.employeeId} in year ${year}`
        );
      }

      const available = this.balanceService.getAvailableDays(balance);
      if (n > available) {
        throw new InsufficientBalanceError(
          `Insufficient balance: ${n} days requested, only ${available} available`
        );
      }

      const overlapping = await this.requestRepository.findApprovedOverlapping(
        request.employeeId,
        request.startDate,
        request.endDate,
        c
      );
      if (overlapping.length > 0) {
        throw new OverlapError(
          'Leave request overlaps an existing approved request'
        );
      }

      await this.balanceService.approve(balance.id, n, c);

      const updated = await this.requestRepository.update(
        {
          ...request,
          status: LeaveRequestStatus.APPROVED,
          approvedBy: actorId,
          approvedAt: new Date(),
          updatedAt: new Date()
        },
        c
      );

      await this.auditService.record(
        {
          entityType: ENTITY_TYPE,
          entityId: requestId,
          action: 'APPROVE',
          oldValues: { status: LeaveRequestStatus.SUBMITTED },
          newValues: { status: LeaveRequestStatus.APPROVED, approvedBy: actorId },
          performedBy: actorId
        },
        c
      );

      await this.notificationService.notify(
        {
          recipientId: request.employeeId,
          type: 'LEAVE_APPROVED',
          title: 'Leave request approved',
          message: `Your leave request ${requestId} was approved`,
          relatedEntityType: ENTITY_TYPE,
          relatedEntityId: requestId
        },
        c
      );

      return updated;
    });
  }

  async reject(
    requestId: string,
    actorId: string,
    rejectionReason: string,
    client?: PoolClient
  ): Promise<LeaveRequest> {
    if (!rejectionReason) {
      throw new ValidationError('rejectionReason is required');
    }

    return this.withClient(client, async (c) => {
      const request = await this.requestRepository.findById(requestId, c);
      if (!request) {
        throw new NotFoundError(`Leave request ${requestId} not found`);
      }
      if (request.status !== LeaveRequestStatus.SUBMITTED) {
        throw new ValidationError('Only SUBMITTED requests can be rejected');
      }

      const n = countLeaveDays(request.startDate, request.endDate);
      const policy = await this.getPolicy(request.leaveTypeId, c);
      const year = request.startDate.getFullYear();
      const balance = await this.findBalance(request.employeeId, policy.id, year, c);
      if (!balance) {
        throw new NotFoundError(
          `No balance found for employee ${request.employeeId} in year ${year}`
        );
      }

      await this.balanceService.reject(balance.id, n, c);

      const updated = await this.requestRepository.update(
        {
          ...request,
          status: LeaveRequestStatus.REJECTED,
          rejectedBy: actorId,
          rejectedAt: new Date(),
          rejectionReason,
          updatedAt: new Date()
        },
        c
      );

      await this.auditService.record(
        {
          entityType: ENTITY_TYPE,
          entityId: requestId,
          action: 'REJECT',
          oldValues: { status: LeaveRequestStatus.SUBMITTED },
          newValues: {
            status: LeaveRequestStatus.REJECTED,
            rejectedBy: actorId,
            rejectionReason
          },
          performedBy: actorId
        },
        c
      );

      await this.notificationService.notify(
        {
          recipientId: request.employeeId,
          type: 'LEAVE_REJECTED',
          title: 'Leave request rejected',
          message: `Your leave request ${requestId} was rejected`,
          relatedEntityType: ENTITY_TYPE,
          relatedEntityId: requestId
        },
        c
      );

      return updated;
    });
  }

  async cancel(
    requestId: string,
    actorId: string,
    role: UserRole,
    client?: PoolClient
  ): Promise<LeaveRequest> {
    return this.withClient(client, async (c) => {
      const request = await this.requestRepository.findById(requestId, c);
      if (!request) {
        throw new NotFoundError(`Leave request ${requestId} not found`);
      }
      if (
        request.status !== LeaveRequestStatus.SUBMITTED &&
        request.status !== LeaveRequestStatus.APPROVED
      ) {
        throw new ValidationError(
          'Only SUBMITTED or APPROVED requests can be cancelled'
        );
      }
      if (request.employeeId !== actorId && role !== UserRole.HR_ADMIN) {
        throw new AuthorizationError(
          'Only the request owner or an HR admin may cancel a request'
        );
      }

      const n = countLeaveDays(request.startDate, request.endDate);
      const policy = await this.getPolicy(request.leaveTypeId, c);
      const year = request.startDate.getFullYear();
      const balance = await this.findBalance(request.employeeId, policy.id, year, c);
      if (!balance) {
        throw new NotFoundError(
          `No balance found for employee ${request.employeeId} in year ${year}`
        );
      }

      const requestStatus =
        request.status === LeaveRequestStatus.APPROVED ? 'APPROVED' : 'PENDING';
      await this.balanceService.cancel(balance.id, n, requestStatus, c);

      const updated = await this.requestRepository.update(
        {
          ...request,
          status: LeaveRequestStatus.CANCELLED,
          cancelledBy: actorId,
          cancelledAt: new Date(),
          updatedAt: new Date()
        },
        c
      );

      await this.auditService.record(
        {
          entityType: ENTITY_TYPE,
          entityId: requestId,
          action: 'CANCEL',
          oldValues: { status: request.status },
          newValues: { status: LeaveRequestStatus.CANCELLED, cancelledBy: actorId },
          performedBy: actorId
        },
        c
      );

      await this.notificationService.notify(
        {
          recipientId: request.employeeId,
          type: 'LEAVE_CANCELLED',
          title: 'Leave request cancelled',
          message: `Leave request ${requestId} was cancelled`,
          relatedEntityType: ENTITY_TYPE,
          relatedEntityId: requestId
        },
        c
      );

      return updated;
    });
  }

  private async getPolicy(
    leaveTypeId: string,
    client?: PoolClient
  ): Promise<LeavePolicy> {
    const policies = await this.policyRepository.findByLeaveTypeId(
      leaveTypeId,
      client
    );
    const active = policies.find((p) => p.isActive);
    if (!active) {
      throw new NotFoundError(`No active policy for leave type ${leaveTypeId}`);
    }
    return active;
  }

  private async findBalance(
    employeeId: string,
    policyId: string,
    fiscalYear: number,
    client?: PoolClient
  ): Promise<LeaveBalance | null> {
    return this.balanceRepository.findByEmployeePolicyAndYear(
      employeeId,
      policyId,
      fiscalYear,
      client
    );
  }

  private async ensureBalance(
    employeeId: string,
    policy: LeavePolicy,
    fiscalYear: number,
    client?: PoolClient
  ): Promise<LeaveBalance> {
    const existing = await this.findBalance(
      employeeId,
      policy.id,
      fiscalYear,
      client
    );
    if (existing) {
      return existing;
    }
    const now = new Date();
    const balance: LeaveBalance = {
      id: randomUUID(),
      employeeId,
      policyId: policy.id,
      fiscalYear,
      totalEntitlement: policy.entitlementDays,
      usedDays: 0,
      pendingDays: 0,
      remainingDays: policy.entitlementDays,
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now
    };
    return this.balanceRepository.create(balance, client);
  }

  private async withClient<T>(
    client: PoolClient | undefined,
    fn: (c: PoolClient) => Promise<T>
  ): Promise<T> {
    if (client) {
      return fn(client);
    }
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      const result = await fn(c);
      await c.query('COMMIT');
      return result;
    } catch (err) {
      await c.query('ROLLBACK');
      throw err;
    } finally {
      c.release();
    }
  }
}
