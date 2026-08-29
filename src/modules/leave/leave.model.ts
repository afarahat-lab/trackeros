import type { PoolClient } from 'pg';

import { LeaveRequestStatus, UserRole } from '../../shared/types';
import type { ILeaveBalanceRepository, IBalanceService } from '../balance';
import type { IAuditService } from '../audit';
import type { INotificationService } from '../notification';
import type { IEmployeeRepository } from '../employee';
import type { ILeaveTypeRepository } from '../leave-type';
import type { ILeavePolicyRepository } from '../policy';

export interface LeaveRequest {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  startDate: Date;
  endDate: Date;
  reason: string | undefined;
  status: LeaveRequestStatus;
  approvedBy: string | null;
  approvedAt: Date | null;
  rejectedBy: string | null;
  rejectedAt: Date | null;
  rejectionReason: string | null;
  cancelledBy: string | null;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubmitLeaveInput {
  employeeId: string;
  leaveTypeId: string;
  startDate: Date;
  endDate: Date;
  reason?: string;
}

export interface ILeaveRequestRepository {
  create(request: LeaveRequest, client?: PoolClient): Promise<LeaveRequest>;
  update(request: LeaveRequest, client?: PoolClient): Promise<LeaveRequest>;
  findById(id: string, client?: PoolClient): Promise<LeaveRequest | null>;
  findOverlappingApproved(
    employeeId: string,
    startDate: Date,
    endDate: Date,
    client?: PoolClient
  ): Promise<LeaveRequest[]>;
}

export interface LeaveServiceDependencies {
  leaveRepository: ILeaveRequestRepository;
  balanceRepository: ILeaveBalanceRepository;
  balanceService: IBalanceService;
  auditService: IAuditService;
  notificationService: INotificationService;
  employeeRepository: IEmployeeRepository;
  leaveTypeRepository: ILeaveTypeRepository;
  policyRepository: ILeavePolicyRepository;
}

export interface ILeaveService {
  submit(
    input: SubmitLeaveInput,
    actorId: string,
    actorRole: UserRole
  ): Promise<LeaveRequest>;
  approve(
    requestId: string,
    actorId: string,
    actorRole: UserRole
  ): Promise<LeaveRequest>;
  reject(
    requestId: string,
    actorId: string,
    actorRole: UserRole,
    rejectionReason?: string
  ): Promise<LeaveRequest>;
  cancel(
    requestId: string,
    actorId: string,
    actorRole: UserRole
  ): Promise<LeaveRequest>;
}

/**
 * The single source of truth for leave day counts (binding rule 1).
 *
 * Calendar days, inclusive of both ends: `endDate - startDate + 1`. No
 * weekend or public-holiday exclusion. Every call site that needs a day
 * count (balance deduction, restoration, sufficiency, entitlement
 * comparison, notice-period enforcement) MUST call this helper rather than
 * re-deriving the count inline.
 */
export function countLeaveDays(startDate: Date, endDate: Date): number {
  const start = Date.UTC(
    startDate.getFullYear(),
    startDate.getMonth(),
    startDate.getDate()
  );
  const end = Date.UTC(
    endDate.getFullYear(),
    endDate.getMonth(),
    endDate.getDate()
  );
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((end - start) / msPerDay) + 1;
}
