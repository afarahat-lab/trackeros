import { randomUUID } from 'crypto';
import { PoolClient } from 'pg';
import { computeAvailableDays } from '../balance';
import type { ILeaveBalanceRepository } from '../balance';
import { IUnitOfWork } from '../../shared/db/unit-of-work';
import { countLeaveDays, LeaveRequestStatus } from '../../shared/types';
import {
  CreateLeaveRequestInput,
  InsufficientLeaveBalanceError,
  InvalidLeaveRequestTransitionError,
  ILeaveService,
  LeaveRequest,
  OverlappingLeaveError,
} from './leave.model';
import { PgLeaveRequestRepository } from './leave.repository';

function dateRangesOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

export class LeaveService implements ILeaveService {
  constructor(
    private readonly leaveRequests: PgLeaveRequestRepository,
    private readonly balances: ILeaveBalanceRepository,
    private readonly uow: IUnitOfWork,
  ) {}

  async apply(input: CreateLeaveRequestInput): Promise<LeaveRequest> {
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
    return this.leaveRequests.create(request);
  }

  async approve(
    id: string,
    approvedBy: string,
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

      return this.leaveRequests.update(
        id,
        { status: LeaveRequestStatus.APPROVED, approvedBy, approvedAt: new Date() },
        db,
      );
    };
    return client ? run(client) : this.uow.withTransaction(run);
  }

  async reject(
    id: string,
    approvedBy: string,
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
      return this.leaveRequests.update(
        id,
        { status: LeaveRequestStatus.REJECTED, approvedBy, approvedAt: new Date() },
        db,
      );
    };
    return client ? run(client) : this.uow.withTransaction(run);
  }

  async cancel(id: string, client?: PoolClient): Promise<LeaveRequest | null> {
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
      return this.leaveRequests.update(
        id,
        { status: LeaveRequestStatus.CANCELLED },
        db,
      );
    };
    return client ? run(client) : this.uow.withTransaction(run);
  }

  async list(client?: PoolClient): Promise<LeaveRequest[]> {
    return this.leaveRequests.list(client);
  }
}
