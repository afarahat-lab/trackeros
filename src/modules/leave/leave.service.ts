import type { PoolClient } from 'pg';

import { countLeaveDays } from '../../shared/leave';
import { AuditAction, LeaveStatus } from '../../shared/types';
import type { CreateLeaveRequestDto } from '../../shared/types';
import { AuditService } from '../audit';
import { LeaveBalanceRepository } from '../balance';
import type { ILeaveBalanceRepository } from '../balance';
import { LeavePolicyRepository } from '../policy';
import type { ILeavePolicyRepository } from '../policy';
import { LeaveForbiddenError } from './leave.errors';
import { LeaveNotFoundError } from './leave.errors';
import {
  ActiveLeavePolicyNotFoundError,
  LeaveStateTransitionError,
} from './leave.errors';
import type { LeaveRequest } from './leave.model';
import { LeaveRequestRepository } from './leave.repository';
import type { ILeaveRequestRepository } from './leave.repository';
import type { ILeaveService } from './leave.service.interface';

const REQUEST_ENTITY = 'LEAVE_REQUEST';

interface LeaveServiceDeps {
  requests: ILeaveRequestRepository;
  balances: ILeaveBalanceRepository;
  policies: ILeavePolicyRepository;
  audit: AuditService;
}

/**
 * Compute the fiscal year a leave request is attributed to from its start
 * date. A request spanning a fiscal-year boundary is still attributed in full
 * to the fiscal year of `startDate`; exactly one LeaveBalance row is debited.
 */
export function fiscalYearForStartDate(startDate: Date): number {
  return startDate.getUTCFullYear();
}

/**
 * Leave domain service. Owns the transactional unit of work for the
 * approve/reject/cancel flows (status transition + balance debit + audit
 * record are applied atomically on a single PoolClient), while RBAC (who may
 * perform each action) is enforced separately at the route boundary.
 */
export class LeaveService implements ILeaveService {
  private readonly requests: ILeaveRequestRepository;
  private readonly balances: ILeaveBalanceRepository;
  private readonly policies: ILeavePolicyRepository;
  private readonly audit: AuditService;

  constructor(deps: LeaveServiceDeps) {
    this.requests = deps.requests;
    this.balances = deps.balances;
    this.policies = deps.policies;
    this.audit = deps.audit;
  }

  async create(input: CreateLeaveRequestDto, client?: PoolClient): Promise<LeaveRequest> {
    const created = await this.requests.create(input, client);

    try {
      await this.audit.record(
        {
          entityType: REQUEST_ENTITY,
          entityId: created.id,
          action: AuditAction.CREATE,
          performedBy: input.employeeId,
          newValues: {
            employeeId: created.employeeId,
            leaveType: created.leaveType,
            startDate: created.startDate,
            endDate: created.endDate,
            reason: created.reason ?? null,
            status: created.status,
          },
        },
        client
      );
    } catch {
      // Audit failures must not fail the create itself.
    }

    return created;
  }

  findById(id: string): Promise<LeaveRequest | null> {
    return this.requests.findById(id);
  }

  findByEmployee(employeeId: string): Promise<LeaveRequest[]> {
    return this.requests.findByEmployee(employeeId);
  }

  findByStatus(status: LeaveStatus): Promise<LeaveRequest[]> {
    return this.requests.findByStatus(status);
  }

  async approve(id: string, approverId: string, client?: PoolClient): Promise<LeaveRequest> {
    const request = await this.requests.findById(id);
    if (!request) {
      throw new LeaveNotFoundError(id);
    }
    if (request.status !== LeaveStatus.PENDING) {
      throw new LeaveStateTransitionError(
        `Leave request '${id}' can only be approved from PENDING, not ${request.status}`
      );
    }
    if (request.employeeId === approverId) {
      throw new LeaveForbiddenError('A manager may not approve their own leave request');
    }

    const days = countLeaveDays(request.startDate, request.endDate);
    const fiscalYear = fiscalYearForStartDate(request.startDate);

    const policy = await this.findActivePolicyFor(request.leaveType);
    const balance = await this.balances.findByEmployeeAndFiscalYear(
      request.employeeId,
      policy.id,
      fiscalYear
    );

    if (!balance || balance.remainingDays < days) {
      throw new LeaveForbiddenError(
        'Cannot approve leave request: it would drive remaining balance below zero'
      );
    }

    await this.balances.commitDays(request.employeeId, policy.id, fiscalYear, days, client);

    const approvedAt = new Date();
    const updated = await this.requests.update(
      id,
      { status: LeaveStatus.APPROVED, approvedBy: approverId, approvedAt },
      client
    );

    await this.recordAuditApproval(id, request, approverId, approvedAt, client);

    return updated;
  }

  async reject(id: string, approverId: string, client?: PoolClient): Promise<LeaveRequest> {
    const request = await this.requests.findById(id);
    if (!request) {
      throw new LeaveNotFoundError(id);
    }
    if (request.status !== LeaveStatus.PENDING) {
      throw new LeaveStateTransitionError(
        `Leave request '${id}' can only be rejected from PENDING, not ${request.status}`
      );
    }
    if (request.employeeId === approverId) {
      throw new LeaveForbiddenError('A manager may not reject their own leave request');
    }

    const approvedAt = new Date();
    const updated = await this.requests.update(
      id,
      { status: LeaveStatus.REJECTED, approvedBy: approverId, approvedAt },
      client
    );

    await this.recordAuditApproval(id, request, approverId, approvedAt, client);

    return updated;
  }

  async cancel(id: string, employeeId: string, client?: PoolClient): Promise<LeaveRequest> {
    const request = await this.requests.findById(id);
    if (!request) {
      throw new LeaveNotFoundError(id);
    }
    if (request.status !== LeaveStatus.PENDING) {
      throw new LeaveStateTransitionError(
        `Leave request '${id}' can only be cancelled from PENDING, not ${request.status}`
      );
    }
    if (request.employeeId !== employeeId) {
      throw new LeaveForbiddenError('An employee may only cancel their own leave request');
    }

    const updated = await this.requests.update(id, { status: LeaveStatus.CANCELLED }, client);

    try {
      await this.audit.record(
        {
          entityType: REQUEST_ENTITY,
          entityId: id,
          action: AuditAction.UPDATE,
          performedBy: employeeId,
          oldValues: { status: LeaveStatus.PENDING },
          newValues: { status: LeaveStatus.CANCELLED },
        },
        client
      );
    } catch {
      // Audit failures must not fail the cancellation itself.
    }

    return updated;
  }

  private async findActivePolicyFor(
    leaveType: LeaveRequest['leaveType']
  ): Promise<{ id: string }> {
    const policies = await this.policies.findByLeaveType(leaveType);
    const active = policies.find((p) => p.isActive);
    if (!active) {
      throw new ActiveLeavePolicyNotFoundError(leaveType);
    }
    return active;
  }

  private async recordAuditApproval(
    id: string,
    request: LeaveRequest,
    approverId: string,
    approvedAt: Date,
    client?: PoolClient
  ): Promise<void> {
    const action =
      request.status === LeaveStatus.APPROVED ? AuditAction.APPROVE : AuditAction.REJECT;

    try {
      await this.audit.record(
        {
          entityType: REQUEST_ENTITY,
          entityId: id,
          action,
          performedBy: approverId,
          oldValues: { status: LeaveStatus.PENDING },
          newValues: {
            status: request.status,
            approvedBy: approverId,
            approvedAt,
          },
        },
        client
      );
    } catch {
      // Audit failures must not fail the approval/rejection itself.
    }
  }
}

/** Convenience factory wiring the default repository/service implementations. */
export function createLeaveService(): LeaveService {
  return new LeaveService({
    requests: new LeaveRequestRepository(),
    balances: new LeaveBalanceRepository(),
    policies: new LeavePolicyRepository(),
    audit: new AuditService(),
  });
}
