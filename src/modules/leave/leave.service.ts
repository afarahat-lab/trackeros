import { AuditAction, LeaveStatus, LeaveType } from '../../shared/types';
import type { CreateLeaveRequestDto } from '../../shared/types';
import { countLeaveDays, fiscalYearOf } from '../../shared/leave';
import type { IUnitOfWork } from '../../shared/db';
import { isSubordinate } from '../auth';
import type { AuthenticatedUser } from '../auth';
import { AuditService } from '../audit';
import type { IAuditService } from '../audit';
import {
  BalanceNotFoundError,
  InsufficientBalanceError,
  LeaveBalanceRepository,
} from '../balance';
import type { ILeaveBalanceRepository } from '../balance';
import { EmployeeNotFoundError, EmployeeRepository } from '../employee';
import type { IEmployeeRepository } from '../employee';
import { LeavePolicyRepository } from '../policy';
import type { ILeavePolicyRepository, LeavePolicy } from '../policy';
import { LeaveNotFoundError, LeaveRequestRepository } from './leave.repository';
import type { ILeaveRequestRepository } from './leave.repository';
import type { LeaveRequest } from './leave.model';

const ENTITY_TYPE = 'LeaveRequest';

/**
 * A service-layer leave error. `code` is the stable machine constant surfaced
 * in the `{ error, code }` response body; `message` is the human-readable text.
 */
export class LeaveServiceError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'LeaveServiceError';
    this.code = code;
  }
}

export interface ILeaveService {
  create(input: CreateLeaveRequestDto): Promise<LeaveRequest>;
  approve(id: string, approver: AuthenticatedUser): Promise<LeaveRequest>;
  reject(id: string, approver: AuthenticatedUser): Promise<LeaveRequest>;
  cancel(id: string, actorId: string): Promise<LeaveRequest>;
}

export interface LeaveServiceDependencies {
  leaveRepository: ILeaveRequestRepository;
  balanceRepository: ILeaveBalanceRepository;
  policyRepository: ILeavePolicyRepository;
  employeeRepository: IEmployeeRepository;
  auditService: IAuditService;
  unitOfWork: IUnitOfWork;
}

export class LeaveService implements ILeaveService {
  private readonly leaveRepository: ILeaveRequestRepository;
  private readonly balanceRepository: ILeaveBalanceRepository;
  private readonly policyRepository: ILeavePolicyRepository;
  private readonly employeeRepository: IEmployeeRepository;
  private readonly auditService: IAuditService;
  private readonly unitOfWork: IUnitOfWork;

  constructor(deps?: Partial<LeaveServiceDependencies> & { unitOfWork: IUnitOfWork }) {
    if (!deps) {
      throw new Error('LeaveService requires a unit of work');
    }
    this.leaveRepository = deps.leaveRepository ?? new LeaveRequestRepository();
    this.balanceRepository = deps.balanceRepository ?? new LeaveBalanceRepository();
    this.policyRepository = deps.policyRepository ?? new LeavePolicyRepository();
    this.employeeRepository = deps.employeeRepository ?? new EmployeeRepository();
    this.auditService = deps.auditService ?? new AuditService();
    this.unitOfWork = deps.unitOfWork;
  }

  async create(input: CreateLeaveRequestDto): Promise<LeaveRequest> {
    if (input.startDate > input.endDate) {
      throw new LeaveServiceError(
        'INVALID_LEAVE_DATES',
        'startDate must not be after endDate'
      );
    }

    // A request may only be created against an ACTIVE policy for its leave type.
    await this.resolveActivePolicy(input.leaveType);

    return this.runInTransaction(async (client) => {
      const request = await this.leaveRepository.create(input, client);

      await this.auditService.record(
        {
          entityType: ENTITY_TYPE,
          entityId: request.id,
          action: AuditAction.CREATE,
          oldValues: null,
          newValues: {
            employeeId: request.employeeId,
            leaveType: request.leaveType,
            startDate: request.startDate.toISOString(),
            endDate: request.endDate.toISOString(),
            status: request.status,
          },
          performedBy: input.employeeId,
        },
        client
      );

      return request;
    });
  }

  async approve(id: string, approver: AuthenticatedUser): Promise<LeaveRequest> {
    const request = await this.leaveRepository.findById(id);
    if (!request) {
      throw new LeaveNotFoundError(id);
    }
    this.assertPending(request, 'approved');

    const applicant = await this.employeeRepository.findById(request.employeeId);
    if (!applicant) {
      throw new EmployeeNotFoundError(request.employeeId);
    }
    if (!isSubordinate(approver, request.employeeId, applicant.managerId)) {
      throw new LeaveServiceError(
        'FORBIDDEN',
        'Only the applicant\'s direct manager may approve a request, and a manager may not approve their own request'
      );
    }

    const policy = await this.resolveActivePolicy(request.leaveType);
    const days = countLeaveDays(request.startDate, request.endDate);
    const fiscalYear = fiscalYearOf(request.startDate);

    // Balance-sufficiency check: the request's full day count for the fiscal
    // year of startDate must be available before any write happens.
    const balance = await this.balanceRepository.findByEmployeeAndFiscalYear(
      request.employeeId,
      policy.id,
      fiscalYear
    );
    if (!balance) {
      throw new BalanceNotFoundError(
        `No leave balance for employee '${request.employeeId}', policy '${policy.id}', fiscal year ${fiscalYear}`
      );
    }
    if (balance.remainingDays < days) {
      throw new InsufficientBalanceError(request.employeeId, policy.id, fiscalYear);
    }

    return this.runInTransaction(async (client) => {
      await this.balanceRepository.commitDays(
        request.employeeId,
        policy.id,
        fiscalYear,
        days,
        client
      );

      const updated = await this.leaveRepository.updateStatus(
        id,
        LeaveStatus.APPROVED,
        approver.id,
        client
      );

      await this.auditService.record(
        {
          entityType: ENTITY_TYPE,
          entityId: request.id,
          action: AuditAction.APPROVE,
          oldValues: { status: LeaveStatus.PENDING },
          newValues: { status: LeaveStatus.APPROVED, approvedBy: approver.id },
          performedBy: approver.id,
        },
        client
      );

      return updated;
    });
  }

  async reject(id: string, approver: AuthenticatedUser): Promise<LeaveRequest> {
    const request = await this.leaveRepository.findById(id);
    if (!request) {
      throw new LeaveNotFoundError(id);
    }
    this.assertPending(request, 'rejected');

    const applicant = await this.employeeRepository.findById(request.employeeId);
    if (!applicant) {
      throw new EmployeeNotFoundError(request.employeeId);
    }
    if (!isSubordinate(approver, request.employeeId, applicant.managerId)) {
      throw new LeaveServiceError(
        'FORBIDDEN',
        'Only the applicant\'s direct manager may reject a request, and a manager may not reject their own request'
      );
    }

    return this.runInTransaction(async (client) => {
      const updated = await this.leaveRepository.updateStatus(
        id,
        LeaveStatus.REJECTED,
        approver.id,
        client
      );

      await this.auditService.record(
        {
          entityType: ENTITY_TYPE,
          entityId: request.id,
          action: AuditAction.REJECT,
          oldValues: { status: LeaveStatus.PENDING },
          newValues: { status: LeaveStatus.REJECTED, rejectedBy: approver.id },
          performedBy: approver.id,
        },
        client
      );

      return updated;
    });
  }

  async cancel(id: string, actorId: string): Promise<LeaveRequest> {
    const request = await this.leaveRepository.findById(id);
    if (!request) {
      throw new LeaveNotFoundError(id);
    }
    this.assertPending(request, 'cancelled');

    if (request.employeeId !== actorId) {
      throw new LeaveServiceError(
        'FORBIDDEN',
        'Only the owner may cancel their own leave request'
      );
    }

    return this.runInTransaction(async (client) => {
      const updated = await this.leaveRepository.updateStatus(
        id,
        LeaveStatus.CANCELLED,
        null,
        client
      );

      await this.auditService.record(
        {
          entityType: ENTITY_TYPE,
          entityId: request.id,
          action: AuditAction.UPDATE,
          oldValues: { status: LeaveStatus.PENDING },
          newValues: { status: LeaveStatus.CANCELLED },
          performedBy: actorId,
        },
        client
      );

      return updated;
    });
  }

  private assertPending(request: LeaveRequest, verb: string): void {
    if (request.status !== LeaveStatus.PENDING) {
      throw new LeaveServiceError(
        'INVALID_STATUS',
        `Leave request '${request.id}' is not PENDING; only PENDING requests may be ${verb}`
      );
    }
  }

  private async resolveActivePolicy(leaveType: LeaveType): Promise<LeavePolicy> {
    const policies = await this.policyRepository.findByLeaveType(leaveType);
    const active = policies.find((policy) => policy.isActive);
    if (!active) {
      throw new LeaveServiceError(
        'NO_ACTIVE_POLICY',
        `No active leave policy for leave type '${leaveType}'`
      );
    }
    return active;
  }

  private getClient(): NonNullable<IUnitOfWork['client']> {
    const client = this.unitOfWork.client;
    if (!client) {
      throw new LeaveServiceError(
        'TRANSACTION_ERROR',
        'Unit of work did not provide a client after begin()'
      );
    }
    return client;
  }

  private async runInTransaction<T>(
    work: (client: NonNullable<IUnitOfWork['client']>) => Promise<T>
  ): Promise<T> {
    await this.unitOfWork.begin();
    try {
      const client = this.getClient();
      const result = await work(client);
      await this.unitOfWork.commit();
      return result;
    } catch (err) {
      await this.unitOfWork.rollback();
      throw err;
    }
  }
}
