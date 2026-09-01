import { randomUUID } from 'crypto';
import { PoolClient } from 'pg';
import { computeAvailableDays } from '../balance';
import type { ILeaveBalanceRepository } from '../balance';
import type { IEmployeeRepository } from '../employee';
import type { ILeavePolicyRepository } from '../policy';
import type { IAuditService } from '../audit';
import { IUnitOfWork } from '../../shared/db/unit-of-work';
import {
  AuditAction,
  countLeaveDays,
  EntityType,
  LeaveRequestStatus,
  LeaveType,
  UserRole,
} from '../../shared/types';
import {
  CreateLeaveRequestInput,
  InactiveEmployeeError,
  InactiveLeavePolicyError,
  InsufficientLeaveBalanceError,
  InvalidLeaveRequestTransitionError,
  ILeaveRequestRepository,
  ILeaveService,
  LeaveAuthorizationError,
  LeaveRequest,
  OverlappingLeaveError,
} from './leave.model';

function dateRangesOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

function toLeaveType(value: string): LeaveType | null {
  const valid = Object.values(LeaveType) as string[];
  return valid.includes(value) ? (value as LeaveType) : null;
}

export class LeaveService implements ILeaveService {
  constructor(
    private readonly leaveRequests: ILeaveRequestRepository,
    private readonly balances: ILeaveBalanceRepository,
    private readonly employees: IEmployeeRepository,
    private readonly policies: ILeavePolicyRepository,
    private readonly audit: IAuditService,
    private readonly uow: IUnitOfWork,
  ) {}

  async apply(
    input: CreateLeaveRequestInput,
    actorId: string,
    actorRole: UserRole,
  ): Promise<LeaveRequest> {
    const run = async (db: PoolClient): Promise<LeaveRequest> => {
      const employee = await this.employees.findById(input.employeeId, db);
      if (!employee || employee.employmentStatus !== 'ACTIVE') {
        throw new InactiveEmployeeError(
          `Employee ${input.employeeId} is not ACTIVE`,
        );
      }

      const leaveType = toLeaveType(input.leaveTypeId);
      if (!leaveType) {
        throw new InactiveLeavePolicyError(
          `Invalid leave type ${input.leaveTypeId}`,
        );
      }
      const policy = await this.policies.findActiveByLeaveType(leaveType, db);
      if (!policy || !policy.isActive) {
        throw new InactiveLeavePolicyError(
          `No active leave policy for leave type ${input.leaveTypeId}`,
        );
      }

      const now = new Date();
      const request: LeaveRequest = {
        id: randomUUID(),
        employeeId: input.employeeId,
        leaveTypeId: input.leaveTypeId,
        startDate: input.startDate,
        endDate: input.endDate,
        reason: input.reason ?? null,
        status: LeaveRequestStatus.PENDING,
        approvedBy: null,
        approvedAt: null,
        createdAt: now,
        updatedAt: now,
      };
      const created = await this.leaveRequests.create(request, db);

      await this.audit.record(
        {
          entityType: EntityType.LEAVE_REQUEST,
          entityId: created.id,
          action: AuditAction.CREATE,
          oldValues: null,
          newValues: {
            employeeId: created.employeeId,
            leaveTypeId: created.leaveTypeId,
            startDate: created.startDate,
            endDate: created.endDate,
            reason: created.reason,
            status: created.status,
          },
          performedBy: actorId,
          performedAt: now,
        },
        db,
      );

      return created;
    };
    return this.uow.withTransaction(run);
  }

  async approve(
    id: string,
    actorId: string,
    actorRole: UserRole,
    client?: PoolClient,
  ): Promise<LeaveRequest | null> {
    const run = async (db: PoolClient): Promise<LeaveRequest | null> => {
      const request = await this.leaveRequests.findById(id, db);
      if (!request) {
        return null;
      }
      if (request.status !== LeaveRequestStatus.PENDING) {
        throw new InvalidLeaveRequestTransitionError(
          `Leave request ${id} cannot be approved from status ${request.status}`,
        );
      }
      await this.assertAuthorized(request, actorId, actorRole, db, 'approve');

      const days = countLeaveDays(request.startDate, request.endDate);
      const employeeRequests = await this.leaveRequests.findByEmployee(
        request.employeeId,
        db,
      );

      const balances = await this.balances.findByEmployee(request.employeeId, db);
      const balance = balances.find((b) => b.policyId === request.leaveTypeId);
      if (!balance) {
        throw new InsufficientLeaveBalanceError(
          `No leave balance found for employee ${request.employeeId} and leave type ${request.leaveTypeId}`,
        );
      }

      const pendingDays = employeeRequests
        .filter(
          (r) =>
            r.status === LeaveRequestStatus.PENDING &&
            r.leaveTypeId === request.leaveTypeId &&
            r.id !== request.id,
        )
        .reduce((sum, r) => sum + countLeaveDays(r.startDate, r.endDate), 0);

      const availableDays = computeAvailableDays(
        balance.totalEntitlement,
        balance.usedDays,
        pendingDays,
      );
      if (days > availableDays) {
        throw new InsufficientLeaveBalanceError(
          `Leave request ${id} requires ${days} days but only ${availableDays} are available`,
        );
      }

      const overlap = employeeRequests.some(
        (r) =>
          r.status === LeaveRequestStatus.APPROVED &&
          r.id !== request.id &&
          dateRangesOverlap(
            r.startDate,
            r.endDate,
            request.startDate,
            request.endDate,
          ),
      );
      if (overlap) {
        throw new OverlappingLeaveError(
          `Leave request ${id} overlaps an APPROVED leave for employee ${request.employeeId}`,
        );
      }

      await this.balances.deduct(balance.id, days, db);

      const approvedAt = new Date();
      const updated = await this.leaveRequests.update(
        id,
        { status: LeaveRequestStatus.APPROVED, approvedBy: actorId, approvedAt },
        db,
      );
      if (!updated) {
        return null;
      }

      await this.audit.record(
        {
          entityType: EntityType.LEAVE_REQUEST,
          entityId: id,
          action: AuditAction.UPDATE,
          oldValues: { status: request.status },
          newValues: { status: LeaveRequestStatus.APPROVED, approvedBy: actorId },
          performedBy: actorId,
          performedAt: approvedAt,
        },
        db,
      );

      return updated;
    };
    return client ? run(client) : this.uow.withTransaction(run);
  }

  async reject(
    id: string,
    actorId: string,
    actorRole: UserRole,
    client?: PoolClient,
  ): Promise<LeaveRequest | null> {
    const run = async (db: PoolClient): Promise<LeaveRequest | null> => {
      const request = await this.leaveRequests.findById(id, db);
      if (!request) {
        return null;
      }
      if (request.status !== LeaveRequestStatus.PENDING) {
        throw new InvalidLeaveRequestTransitionError(
          `Leave request ${id} cannot be rejected from status ${request.status}`,
        );
      }
      await this.assertAuthorized(request, actorId, actorRole, db, 'reject');

      const rejectedAt = new Date();
      const updated = await this.leaveRequests.update(
        id,
        { status: LeaveRequestStatus.REJECTED, approvedBy: actorId, approvedAt: rejectedAt },
        db,
      );
      if (!updated) {
        return null;
      }

      await this.audit.record(
        {
          entityType: EntityType.LEAVE_REQUEST,
          entityId: id,
          action: AuditAction.UPDATE,
          oldValues: { status: request.status },
          newValues: { status: LeaveRequestStatus.REJECTED, approvedBy: actorId },
          performedBy: actorId,
          performedAt: rejectedAt,
        },
        db,
      );

      return updated;
    };
    return client ? run(client) : this.uow.withTransaction(run);
  }

  async cancel(
    id: string,
    actorId: string,
    actorRole: UserRole,
    client?: PoolClient,
  ): Promise<LeaveRequest | null> {
    const run = async (db: PoolClient): Promise<LeaveRequest | null> => {
      const request = await this.leaveRequests.findById(id, db);
      if (!request) {
        return null;
      }
      if (
        request.status !== LeaveRequestStatus.PENDING &&
        request.status !== LeaveRequestStatus.APPROVED
      ) {
        throw new InvalidLeaveRequestTransitionError(
          `Leave request ${id} cannot be cancelled from status ${request.status}`,
        );
      }
      await this.assertAuthorized(request, actorId, actorRole, db, 'cancel');

      const cancelledAt = new Date();
      const updated = await this.leaveRequests.update(
        id,
        { status: LeaveRequestStatus.CANCELLED },
        db,
      );
      if (!updated) {
        return null;
      }

      await this.audit.record(
        {
          entityType: EntityType.LEAVE_REQUEST,
          entityId: id,
          action: AuditAction.UPDATE,
          oldValues: { status: request.status },
          newValues: { status: LeaveRequestStatus.CANCELLED },
          performedBy: actorId,
          performedAt: cancelledAt,
        },
        db,
      );

      return updated;
    };
    return client ? run(client) : this.uow.withTransaction(run);
  }

  async list(client?: PoolClient): Promise<LeaveRequest[]> {
    return this.leaveRequests.list(client);
  }

  private async assertAuthorized(
    request: LeaveRequest,
    actorId: string,
    actorRole: UserRole,
    db: PoolClient,
    action: string,
  ): Promise<void> {
    if (actorRole === UserRole.HR_ADMIN) {
      return;
    }
    const employee = await this.employees.findById(request.employeeId, db);
    if (!employee || actorId !== employee.managerId) {
      throw new LeaveAuthorizationError(
        `Actor ${actorId} is not authorized to ${action} leave request ${request.id}`,
      );
    }
  }
}
