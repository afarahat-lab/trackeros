import { PoolClient } from 'pg';
import {
  LeaveService,
  LeaveActor,
  ILeaveRepository,
  LeaveRequest,
  CreateLeaveRequestInput,
  PendingDecision,
} from '../../../../src/modules/leave';
import {
  IBalanceRepository,
  LeaveBalance,
  CreateLeaveBalanceInput,
} from '../../../../src/modules/balance';
import {
  IAuditService,
  AuditLog,
  CreateAuditLogInput,
} from '../../../../src/modules/audit';
import {
  INotificationService,
  Notification,
  CreateNotificationInput,
} from '../../../../src/modules/notification';
import { IValidationService } from '../../../../src/modules/validation';
import { IEmployeeService, Employee } from '../../../../src/modules/employee';
import {
  IPolicyService,
  LeavePolicy,
  LeavePolicyStatus,
} from '../../../../src/modules/policy';
import { IUnitOfWork } from '../../../../src/shared/db';
import {
  ValidationError,
  NotFoundError,
  ConflictError,
  ForbiddenError,
  UnauthorizedError,
} from '../../../../src/shared/errors';
import {
  LeaveStatus,
  LeaveTypeCode,
  EmployeeRole,
  AuditAction,
  EmploymentStatus,
  CreateLeaveRequestDto,
  UpdateLeaveRequestDto,
  EmployeeProfile,
  LEAVE_REQUEST_ENTITY_TYPE,
} from '../../../../src/shared/types';

// ---------------------------------------------------------------------------
// Fakes
// ---------------------------------------------------------------------------

class FakeLeaveRepository implements ILeaveRepository {
  rows: LeaveRequest[] = [];
  createCalls: { input: CreateLeaveRequestInput; client?: PoolClient }[] = [];
  updateCalls: { id: string; changes: UpdateLeaveRequestDto; client?: PoolClient }[] = [];
  findByIdCalls: { id: string; client?: PoolClient }[] = [];
  findReversesCalls: { reversesRequestId: string; client?: PoolClient }[] = [];
  findPendingCalls: (string[] | undefined)[] = [];
  pendingOverride: PendingDecision[] | null = null;
  private idCounter = 0;

  async create(input: CreateLeaveRequestInput, client?: PoolClient): Promise<LeaveRequest> {
    this.createCalls.push({ input, client });
    this.idCounter += 1;
    const request: LeaveRequest = { id: `lr-${this.idCounter}`, ...input };
    this.rows.push(request);
    return { ...request };
  }

  async findById(id: string, client?: PoolClient): Promise<LeaveRequest | null> {
    this.findByIdCalls.push({ id, client });
    return this.rows.find((r) => r.id === id) ?? null;
  }

  async findByReversesRequestId(
    reversesRequestId: string,
    client?: PoolClient
  ): Promise<LeaveRequest | null> {
    this.findReversesCalls.push({ reversesRequestId, client });
    return this.rows.find((r) => r.reversesRequestId === reversesRequestId) ?? null;
  }

  async update(
    id: string,
    changes: UpdateLeaveRequestDto,
    client?: PoolClient
  ): Promise<LeaveRequest> {
    this.updateCalls.push({ id, changes, client });
    const index = this.rows.findIndex((r) => r.id === id);
    if (index === -1) {
      throw new NotFoundError('Leave request not found');
    }
    this.rows[index] = { ...this.rows[index], ...changes };
    return { ...this.rows[index] };
  }

  async findByQuery(): Promise<LeaveRequest[]> {
    return [...this.rows];
  }

  async findPendingDecisions(employeeIds?: string[]): Promise<PendingDecision[]> {
    this.findPendingCalls.push(employeeIds);
    if (this.pendingOverride !== null) {
      return this.pendingOverride;
    }
    return this.rows
      .filter((r) => r.status === LeaveStatus.SUBMITTED)
      .filter((r) => employeeIds === undefined || employeeIds.length === 0 || employeeIds.includes(r.employeeId))
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
      .map((r) => ({
        requestId: r.id,
        employeeId: r.employeeId,
        leaveTypeCode: r.leaveTypeCode,
        startDate: r.startDate,
        endDate: r.endDate,
        requestedDays: r.requestedDays,
        status: r.status,
      }));
  }
}

class FakeBalanceRepository implements IBalanceRepository {
  rows: LeaveBalance[] = [];
  findByKeyCalls: { client?: PoolClient; forUpdate?: boolean }[] = [];
  updateCalls: {
    id: string;
    changes: Partial<Omit<LeaveBalance, 'id'>>;
    client?: PoolClient;
  }[] = [];
  private idCounter = 0;

  async create(input: CreateLeaveBalanceInput, _client?: PoolClient): Promise<LeaveBalance> {
    this.idCounter += 1;
    const balance: LeaveBalance = { id: `balance-${this.idCounter}`, ...input };
    this.rows.push(balance);
    return { ...balance };
  }

  async findById(id: string): Promise<LeaveBalance | null> {
    return this.rows.find((b) => b.id === id) ?? null;
  }

  async findByKey(
    employeeId: string,
    leaveTypeCode: LeaveTypeCode,
    _periodStart: Date,
    _periodEnd: Date,
    _client?: PoolClient,
    forUpdate?: boolean
  ): Promise<LeaveBalance | null> {
    this.findByKeyCalls.push({ client: _client, forUpdate });
    return (
      this.rows.find(
        (b) => b.employeeId === employeeId && b.leaveTypeCode === leaveTypeCode
      ) ?? null
    );
  }

  async update(
    id: string,
    changes: Partial<Omit<LeaveBalance, 'id'>>,
    client?: PoolClient
  ): Promise<LeaveBalance> {
    this.updateCalls.push({ id, changes, client });
    const index = this.rows.findIndex((b) => b.id === id);
    if (index === -1) {
      throw new NotFoundError('Leave balance not found');
    }
    this.rows[index] = { ...this.rows[index], ...changes };
    return { ...this.rows[index] };
  }
}

class FakeAuditService implements IAuditService {
  records: CreateAuditLogInput[] = [];
  recordClients: (PoolClient | undefined)[] = [];
  failNext = false;

  async record(input: CreateAuditLogInput, client?: PoolClient): Promise<AuditLog> {
    if (this.failNext) {
      this.failNext = false;
      throw new Error('audit insert failed');
    }
    this.records.push(input);
    this.recordClients.push(client);
    return { id: `audit-${this.records.length}`, occurredAt: new Date(), ...input };
  }

  async getById(): Promise<AuditLog> {
    throw new Error('Not implemented');
  }

  async getByEntity(entityType: string, entityId: string): Promise<AuditLog[]> {
    return this.records
      .filter((r) => r.entityType === entityType && r.entityId === entityId)
      .map((r, index) => ({ id: `audit-${index + 1}`, occurredAt: new Date(), ...r }));
  }
}

class FakeNotificationService implements INotificationService {
  inputs: CreateNotificationInput[] = [];
  createClients: (PoolClient | undefined)[] = [];

  async create(input: CreateNotificationInput, client?: PoolClient): Promise<Notification> {
    this.inputs.push(input);
    this.createClients.push(client);
    return {
      id: `notification-${this.inputs.length}`,
      status: input.status ?? 'PENDING',
      createdAt: new Date(),
      readAt: null,
      ...input,
    } as Notification;
  }

  async getById(): Promise<Notification> {
    throw new Error('Not implemented');
  }

  async markRead(): Promise<Notification> {
    throw new Error('Not implemented');
  }
}

class FakeValidationService implements IValidationService {
  error: Error | null = null;

  validateDateRange(): void {}

  validateSufficiency(): void {}

  validateLeaveRequest(): void {
    if (this.error) {
      throw this.error;
    }
  }
}

class FakeEmployeeService implements IEmployeeService {
  constructor(private rows: Employee[] = []) {}

  async createEmployee(): Promise<Employee> {
    throw new Error('Not implemented');
  }

  async getEmployeeById(id: string): Promise<Employee> {
    const employee = this.rows.find((e) => e.id === id);
    if (!employee) {
      throw new NotFoundError('Employee not found');
    }
    return employee;
  }

  async getEmployeeByEmail(email: string): Promise<Employee> {
    const employee = this.rows.find((e) => e.email === email);
    if (!employee) {
      throw new NotFoundError('Employee not found');
    }
    return employee;
  }

  async getEmployeesByManagerId(managerId: string): Promise<Employee[]> {
    return this.rows.filter((e) => e.managerId === managerId);
  }

  async getEmployeeProfileById(id: string): Promise<EmployeeProfile> {
    throw new Error('Not implemented');
  }
}

class FakePolicyService implements IPolicyService {
  constructor(private rows: LeavePolicy[] = []) {}

  async createLeavePolicy(): Promise<LeavePolicy> {
    throw new Error('Not implemented');
  }

  async getLeavePolicyById(id: string): Promise<LeavePolicy> {
    const policy = this.rows.find((p) => p.id === id);
    if (!policy) {
      throw new NotFoundError('Leave policy not found');
    }
    return policy;
  }

  async getPolicyByLeaveTypeCode(leaveTypeCode: LeaveTypeCode): Promise<LeavePolicy> {
    const policy = this.rows.find((p) => p.leaveTypeCode === leaveTypeCode);
    if (!policy) {
      throw new NotFoundError('Leave policy not found');
    }
    return policy;
  }

  async getAllPolicies(): Promise<LeavePolicy[]> {
    return this.rows;
  }
}

class FakeUnitOfWork implements IUnitOfWork {
  readonly stubClient = {} as PoolClient;
  callCount = 0;
  rolledBack = false;

  async withTransaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
    this.callCount += 1;
    try {
      return await work(this.stubClient);
    } catch (err) {
      // A real unit of work rolls back here; recording it is what makes the
      // all-or-nothing guarantee assertable.
      this.rolledBack = true;
      throw err;
    }
  }
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const REQUESTER_ID = 'emp-1';
const MANAGER_ID = 'mgr-1';
const START = new Date('2024-06-01T00:00:00Z');
const END = new Date('2024-06-03T00:00:00Z');
const REQUESTED_DAYS = 3;

function makeEmployee(id = REQUESTER_ID, overrides: Partial<Employee> = {}): Employee {
  return {
    id,
    employeeNumber: `E-${id}`,
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.com',
    role: EmployeeRole.EMPLOYEE,
    managerId: MANAGER_ID,
    department: 'Engineering',
    hireDate: new Date('2020-01-01T00:00:00Z'),
    terminationDate: null,
    employmentStatus: EmploymentStatus.ACTIVE,
    passwordHash: null,
    ...overrides,
  };
}

function makePolicy(overrides: Partial<LeavePolicy> = {}): LeavePolicy {
  return {
    id: 'policy-1',
    leaveTypeCode: LeaveTypeCode.ANNUAL,
    policyName: 'Annual Leave Policy',
    annualEntitlementDays: 20,
    accrualPeriodMonths: 12,
    carryForwardDays: 5,
    minNoticeDays: 2,
    maxRequestDays: 15,
    requiresManagerApproval: true,
    effectiveFrom: new Date('2024-01-01T00:00:00Z'),
    effectiveTo: null,
    status: LeavePolicyStatus.ACTIVE,
    ...overrides,
  };
}

function makeBalance(overrides: Partial<CreateLeaveBalanceInput> = {}): CreateLeaveBalanceInput {
  return {
    employeeId: REQUESTER_ID,
    leaveTypeCode: LeaveTypeCode.ANNUAL,
    periodStart: new Date('2024-01-01T00:00:00Z'),
    periodEnd: new Date('2025-01-01T00:00:00Z'),
    entitledDays: 20,
    usedDays: 0,
    pendingDays: 0,
    ...overrides,
  };
}

function makeDto(overrides: Partial<CreateLeaveRequestDto> = {}): CreateLeaveRequestDto {
  return {
    employeeId: 'client-supplied-id',
    leaveTypeCode: LeaveTypeCode.ANNUAL,
    startDate: START,
    endDate: END,
    ...overrides,
  };
}

function makeRequest(overrides: Partial<LeaveRequest> = {}): LeaveRequest {
  return {
    id: 'lr-1',
    employeeId: REQUESTER_ID,
    leaveTypeCode: LeaveTypeCode.ANNUAL,
    startDate: START,
    endDate: END,
    requestedDays: REQUESTED_DAYS,
    reason: null,
    status: LeaveStatus.DRAFT,
    approverId: null,
    approvalComment: null,
    submittedAt: null,
    decidedAt: null,
    cancelledBy: null,
    cancelledAt: null,
    reversesRequestId: null,
    ...overrides,
  };
}

function makeActor(overrides: Partial<LeaveActor> = {}): LeaveActor {
  return { id: REQUESTER_ID, role: EmployeeRole.EMPLOYEE, ...overrides };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('LeaveService', () => {
  let repository: FakeLeaveRepository;
  let balanceRepository: FakeBalanceRepository;
  let auditService: FakeAuditService;
  let notificationService: FakeNotificationService;
  let validationService: FakeValidationService;
  let employeeService: FakeEmployeeService;
  let policyService: FakePolicyService;
  let uow: FakeUnitOfWork;
  let service: LeaveService;

  beforeEach(() => {
    repository = new FakeLeaveRepository();
    balanceRepository = new FakeBalanceRepository();
    auditService = new FakeAuditService();
    notificationService = new FakeNotificationService();
    validationService = new FakeValidationService();
    employeeService = new FakeEmployeeService([
      makeEmployee(REQUESTER_ID),
      makeEmployee(MANAGER_ID, { role: EmployeeRole.MANAGER }),
    ]);
    policyService = new FakePolicyService([makePolicy()]);
    uow = new FakeUnitOfWork();
    service = new LeaveService(
      repository,
      balanceRepository,
      auditService,
      notificationService,
      validationService,
      employeeService,
      policyService,
      uow
    );
  });

  describe('create', () => {
    beforeEach(async () => {
      await balanceRepository.create(makeBalance());
    });

    it('creates a DRAFT request owned by the actor with the inclusive day count', async () => {
      const created = await service.create(makeActor(), makeDto());

      expect(created.status).toBe(LeaveStatus.DRAFT);
      expect(created.employeeId).toBe(REQUESTER_ID);
      expect(created.requestedDays).toBe(REQUESTED_DAYS);
      expect(created.approverId).toBeNull();
      expect(created.approvalComment).toBeNull();
      expect(created.submittedAt).toBeNull();
      expect(created.decidedAt).toBeNull();

      expect(repository.createCalls).toHaveLength(1);
      expect(repository.createCalls[0].input.employeeId).toBe(REQUESTER_ID);
      expect(repository.createCalls[0].input.status).toBe(LeaveStatus.DRAFT);
    });

    it('records a CREATE audit record for the new request', async () => {
      const created = await service.create(makeActor(), makeDto());

      expect(auditService.records).toHaveLength(1);
      expect(auditService.records[0].action).toBe(AuditAction.CREATE);
      expect(auditService.records[0].entityType).toBe('leave_request');
      expect(auditService.records[0].entityId).toBe(created.id);
      expect(auditService.records[0].actorId).toBe(REQUESTER_ID);
      expect(auditService.records[0].beforeState).toBeNull();
    });

    it('rejects a missing actor with UnauthorizedError', async () => {
      await expect(service.create({ id: '', role: EmployeeRole.EMPLOYEE }, makeDto())).rejects.toThrow(
        UnauthorizedError
      );
    });

    it('rejects an invalid actor role with ForbiddenError', async () => {
      await expect(
        service.create({ id: REQUESTER_ID, role: 'GUEST' as EmployeeRole }, makeDto())
      ).rejects.toThrow(ForbiddenError);
    });

    it('throws NotFoundError when no balance exists for the requested period', async () => {
      balanceRepository.rows = [];
      await expect(service.create(makeActor(), makeDto())).rejects.toThrow(NotFoundError);
    });

    it('propagates ValidationError from validateLeaveRequest', async () => {
      validationService.error = new ValidationError('Invalid leave request');
      await expect(service.create(makeActor(), makeDto())).rejects.toThrow(ValidationError);
    });

    it('propagates ConflictError from validateLeaveRequest (insufficient balance)', async () => {
      validationService.error = new ConflictError('Insufficient leave balance');
      await expect(service.create(makeActor(), makeDto())).rejects.toThrow(ConflictError);
    });
  });

  describe('submit', () => {
    beforeEach(async () => {
      await balanceRepository.create(makeBalance());
      await repository.create(makeRequest());
    });

    it('transitions DRAFT -> SUBMITTED and reserves pending days inside the transaction', async () => {
      const submitted = await service.submit(makeActor(), 'lr-1');

      expect(submitted.status).toBe(LeaveStatus.SUBMITTED);
      expect(repository.updateCalls).toHaveLength(1);
      expect(repository.updateCalls[0].changes.status).toBe(LeaveStatus.SUBMITTED);
      expect(repository.updateCalls[0].client).toBe(uow.stubClient);

      // pendingDays incremented by requestedDays, all inside the same unit of work.
      expect(balanceRepository.updateCalls).toHaveLength(1);
      expect(balanceRepository.updateCalls[0].changes.pendingDays).toBe(REQUESTED_DAYS);
      expect(balanceRepository.updateCalls[0].client).toBe(uow.stubClient);

      expect(auditService.records).toHaveLength(1);
      expect(auditService.records[0].action).toBe(AuditAction.UPDATE);
      expect(auditService.recordClients[0]).toBe(uow.stubClient);
      expect(uow.callCount).toBe(1);
    });

    it('rejects a non-owner with ForbiddenError', async () => {
      await expect(
        service.submit(makeActor({ id: 'other-employee' }), 'lr-1')
      ).rejects.toThrow(ForbiddenError);
    });

    it('rejects a non-DRAFT request with ConflictError', async () => {
      await repository.update('lr-1', { status: LeaveStatus.SUBMITTED });
      await expect(service.submit(makeActor(), 'lr-1')).rejects.toThrow(ConflictError);
    });

    it('rejects an unknown request with NotFoundError', async () => {
      await expect(service.submit(makeActor(), 'missing')).rejects.toThrow(NotFoundError);
    });
  });

  describe('approve', () => {
    const manager = makeActor({ id: MANAGER_ID, role: EmployeeRole.MANAGER });

    beforeEach(async () => {
      await balanceRepository.create(makeBalance({ pendingDays: REQUESTED_DAYS }));
      await repository.create(makeRequest({ status: LeaveStatus.SUBMITTED }));
    });

    it('atomically approves: status, balance deltas, audit and notification in one unit of work', async () => {
      const approved = await service.approve(manager, 'lr-1');

      expect(approved.status).toBe(LeaveStatus.APPROVED);
      expect(approved.approverId).toBe(MANAGER_ID);
      expect(approved.decidedAt).toBeInstanceOf(Date);

      expect(repository.updateCalls).toHaveLength(1);
      expect(repository.updateCalls[0].changes.status).toBe(LeaveStatus.APPROVED);
      expect(repository.updateCalls[0].changes.approverId).toBe(MANAGER_ID);
      expect(repository.updateCalls[0].client).toBe(uow.stubClient);

      // pendingDays decremented and usedDays incremented by requestedDays.
      expect(balanceRepository.updateCalls).toHaveLength(1);
      expect(balanceRepository.updateCalls[0].changes.pendingDays).toBe(0);
      expect(balanceRepository.updateCalls[0].changes.usedDays).toBe(REQUESTED_DAYS);
      expect(balanceRepository.updateCalls[0].client).toBe(uow.stubClient);

      expect(auditService.records).toHaveLength(1);
      expect(auditService.records[0].action).toBe(AuditAction.APPROVE);
      expect(auditService.records[0].entityType).toBe('leave_request');
      expect(auditService.records[0].entityId).toBe('lr-1');
      expect(auditService.recordClients[0]).toBe(uow.stubClient);

      expect(notificationService.inputs).toHaveLength(1);
      expect(notificationService.inputs[0].recipientId).toBe(REQUESTER_ID);
      expect(notificationService.inputs[0].title).toBe('Leave request approved');
      expect(notificationService.inputs[0].relatedEntityType).toBe('leave_request');
      expect(notificationService.inputs[0].relatedEntityId).toBe('lr-1');
      expect(notificationService.createClients[0]).toBe(uow.stubClient);

      expect(uow.callCount).toBe(1);
    });

    it('rejects a non-manager/admin role with ForbiddenError', async () => {
      await expect(service.approve(makeActor(), 'lr-1')).rejects.toThrow(ForbiddenError);
    });

    it('rejects self-approval with ForbiddenError', async () => {
      await expect(
        service.approve({ id: REQUESTER_ID, role: EmployeeRole.MANAGER }, 'lr-1')
      ).rejects.toThrow(ForbiddenError);
    });

    it('rejects a non-direct manager with ForbiddenError', async () => {
      await expect(
        service.approve({ id: 'other-mgr', role: EmployeeRole.MANAGER }, 'lr-1')
      ).rejects.toThrow(ForbiddenError);
    });

    it('allows an ADMIN to approve without being the direct manager', async () => {
      const approved = await service.approve(
        { id: 'admin-1', role: EmployeeRole.ADMIN },
        'lr-1'
      );
      expect(approved.status).toBe(LeaveStatus.APPROVED);
      expect(approved.approverId).toBe('admin-1');
    });

    it('rejects a non-SUBMITTED request with ConflictError', async () => {
      await repository.update('lr-1', { status: LeaveStatus.DRAFT });
      await expect(service.approve(manager, 'lr-1')).rejects.toThrow(ConflictError);
    });

    it('rejects insufficient pendingDays with ConflictError', async () => {
      await balanceRepository.update('balance-1', { pendingDays: 1 });
      await expect(service.approve(manager, 'lr-1')).rejects.toThrow(ConflictError);
    });

    it('rejects an unknown request with NotFoundError', async () => {
      await expect(service.approve(manager, 'missing')).rejects.toThrow(NotFoundError);
    });
  });

  describe('reject', () => {
    const manager = makeActor({ id: MANAGER_ID, role: EmployeeRole.MANAGER });

    beforeEach(async () => {
      await balanceRepository.create(makeBalance({ pendingDays: REQUESTED_DAYS }));
      await repository.create(makeRequest({ status: LeaveStatus.SUBMITTED }));
    });

    it('atomically rejects: status, pendingDays decrement, audit and notification in one unit of work', async () => {
      const rejected = await service.reject(manager, 'lr-1');

      expect(rejected.status).toBe(LeaveStatus.REJECTED);
      expect(rejected.approverId).toBe(MANAGER_ID);
      expect(rejected.decidedAt).toBeInstanceOf(Date);

      expect(repository.updateCalls).toHaveLength(1);
      expect(repository.updateCalls[0].changes.status).toBe(LeaveStatus.REJECTED);
      expect(repository.updateCalls[0].client).toBe(uow.stubClient);

      // Only pendingDays decremented; usedDays untouched.
      expect(balanceRepository.updateCalls).toHaveLength(1);
      expect(balanceRepository.updateCalls[0].changes.pendingDays).toBe(0);
      expect(balanceRepository.updateCalls[0].changes.usedDays).toBeUndefined();
      expect(balanceRepository.updateCalls[0].client).toBe(uow.stubClient);

      expect(auditService.records).toHaveLength(1);
      expect(auditService.records[0].action).toBe(AuditAction.REJECT);
      expect(auditService.records[0].entityType).toBe('leave_request');
      expect(auditService.records[0].entityId).toBe('lr-1');
      expect(auditService.recordClients[0]).toBe(uow.stubClient);

      expect(notificationService.inputs).toHaveLength(1);
      expect(notificationService.inputs[0].recipientId).toBe(REQUESTER_ID);
      expect(notificationService.inputs[0].title).toBe('Leave request rejected');
      expect(notificationService.createClients[0]).toBe(uow.stubClient);

      expect(uow.callCount).toBe(1);
    });

    it('rejects a non-manager/admin role with ForbiddenError', async () => {
      await expect(service.reject(makeActor(), 'lr-1')).rejects.toThrow(ForbiddenError);
    });

    it('rejects self-rejection with ForbiddenError', async () => {
      await expect(
        service.reject({ id: REQUESTER_ID, role: EmployeeRole.MANAGER }, 'lr-1')
      ).rejects.toThrow(ForbiddenError);
    });

    it('rejects a non-direct manager with ForbiddenError', async () => {
      await expect(
        service.reject({ id: 'other-mgr', role: EmployeeRole.MANAGER }, 'lr-1')
      ).rejects.toThrow(ForbiddenError);
    });

    it('rejects a non-SUBMITTED request with ConflictError', async () => {
      await repository.update('lr-1', { status: LeaveStatus.DRAFT });
      await expect(service.reject(manager, 'lr-1')).rejects.toThrow(ConflictError);
    });

    it('rejects insufficient pendingDays with ConflictError', async () => {
      await balanceRepository.update('balance-1', { pendingDays: 1 });
      await expect(service.reject(manager, 'lr-1')).rejects.toThrow(ConflictError);
    });

    it('rejects an unknown request with NotFoundError', async () => {
      await expect(service.reject(manager, 'missing')).rejects.toThrow(NotFoundError);
    });
  });

  describe('cancel', () => {
    const manager = makeActor({ id: MANAGER_ID, role: EmployeeRole.MANAGER });
    const admin = makeActor({ id: 'admin-1', role: EmployeeRole.ADMIN });
    const FUTURE_START = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const FUTURE_END = new Date(Date.now() + 32 * 24 * 60 * 60 * 1000);

    beforeEach(async () => {
      await balanceRepository.create(makeBalance());
    });

    it('owner cancels their own DRAFT without touching the balance', async () => {
      await repository.create(
        makeRequest({ startDate: FUTURE_START, endDate: FUTURE_END })
      );

      const cancelled = await service.cancel(makeActor(), 'lr-1');

      expect(cancelled.status).toBe(LeaveStatus.CANCELLED);
      expect(cancelled.cancelledBy).toBe(REQUESTER_ID);
      expect(cancelled.cancelledAt).toBeInstanceOf(Date);

      expect(repository.updateCalls).toHaveLength(1);
      expect(repository.updateCalls[0].changes.status).toBe(LeaveStatus.CANCELLED);
      expect(repository.updateCalls[0].changes.cancelledBy).toBe(REQUESTER_ID);
      expect(repository.updateCalls[0].client).toBe(uow.stubClient);

      // DRAFT reserved nothing: no balance read or write.
      expect(balanceRepository.findByKeyCalls).toHaveLength(0);
      expect(balanceRepository.updateCalls).toHaveLength(0);

      expect(auditService.records).toHaveLength(1);
      expect(auditService.records[0].action).toBe(AuditAction.CANCEL);
      expect(auditService.records[0].entityId).toBe('lr-1');
      expect(auditService.recordClients[0]).toBe(uow.stubClient);

      expect(notificationService.inputs).toHaveLength(1);
      expect(notificationService.inputs[0].recipientId).toBe(REQUESTER_ID);
      expect(notificationService.inputs[0].title).toBe('Leave request cancelled');
      expect(notificationService.createClients[0]).toBe(uow.stubClient);

      expect(uow.callCount).toBe(1);
    });

    it('owner cancels their own SUBMITTED request and releases pendingDays', async () => {
      await balanceRepository.update('balance-1', { pendingDays: REQUESTED_DAYS });
      await repository.create(
        makeRequest({
          status: LeaveStatus.SUBMITTED,
          startDate: FUTURE_START,
          endDate: FUTURE_END,
        })
      );
      balanceRepository.updateCalls.length = 0;
      balanceRepository.findByKeyCalls.length = 0;

      const cancelled = await service.cancel(makeActor(), 'lr-1');

      expect(cancelled.status).toBe(LeaveStatus.CANCELLED);
      expect(balanceRepository.findByKeyCalls.some((c) => c.forUpdate)).toBe(true);
      expect(balanceRepository.updateCalls).toHaveLength(1);
      expect(balanceRepository.updateCalls[0].changes.pendingDays).toBe(0);
      expect(balanceRepository.updateCalls[0].changes.usedDays).toBeUndefined();
      expect(balanceRepository.updateCalls[0].client).toBe(uow.stubClient);
    });

    it('direct manager cancels an APPROVED request and releases usedDays', async () => {
      await balanceRepository.update('balance-1', { usedDays: REQUESTED_DAYS });
      await repository.create(
        makeRequest({
          status: LeaveStatus.APPROVED,
          startDate: FUTURE_START,
          endDate: FUTURE_END,
        })
      );
      balanceRepository.updateCalls.length = 0;
      balanceRepository.findByKeyCalls.length = 0;

      const cancelled = await service.cancel(manager, 'lr-1');

      expect(cancelled.status).toBe(LeaveStatus.CANCELLED);
      expect(cancelled.cancelledBy).toBe(MANAGER_ID);
      expect(balanceRepository.findByKeyCalls.some((c) => c.forUpdate)).toBe(true);
      expect(balanceRepository.updateCalls).toHaveLength(1);
      expect(balanceRepository.updateCalls[0].changes.usedDays).toBe(0);
      expect(balanceRepository.updateCalls[0].changes.pendingDays).toBeUndefined();
      expect(balanceRepository.updateCalls[0].client).toBe(uow.stubClient);
    });

    it('allows an ADMIN to cancel an APPROVED request without being the direct manager', async () => {
      await balanceRepository.update('balance-1', { usedDays: REQUESTED_DAYS });
      await repository.create(
        makeRequest({
          status: LeaveStatus.APPROVED,
          startDate: FUTURE_START,
          endDate: FUTURE_END,
        })
      );

      const cancelled = await service.cancel(admin, 'lr-1');
      expect(cancelled.status).toBe(LeaveStatus.CANCELLED);
      expect(cancelled.cancelledBy).toBe('admin-1');
    });

    it('rejects a non-owner, non-manager cancelling a DRAFT with ForbiddenError', async () => {
      await repository.create(
        makeRequest({ startDate: FUTURE_START, endDate: FUTURE_END })
      );
      await expect(
        service.cancel(makeActor({ id: 'other-employee' }), 'lr-1')
      ).rejects.toThrow(ForbiddenError);
    });

    it('rejects the owner cancelling their own APPROVED request with ForbiddenError', async () => {
      await repository.create(
        makeRequest({
          status: LeaveStatus.APPROVED,
          startDate: FUTURE_START,
          endDate: FUTURE_END,
        })
      );
      await expect(service.cancel(makeActor(), 'lr-1')).rejects.toThrow(ForbiddenError);
    });

    it('rejects a non-direct manager cancelling an APPROVED request with ForbiddenError', async () => {
      await repository.create(
        makeRequest({
          status: LeaveStatus.APPROVED,
          startDate: FUTURE_START,
          endDate: FUTURE_END,
        })
      );
      await expect(
        service.cancel(makeActor({ id: 'other-mgr', role: EmployeeRole.MANAGER }), 'lr-1')
      ).rejects.toThrow(ForbiddenError);
    });

    it('blocks cancellation once the leave has already begun with ConflictError', async () => {
      await repository.create(
        makeRequest({ startDate: new Date(Date.now() - 60_000) })
      );
      await expect(service.cancel(makeActor(), 'lr-1')).rejects.toThrow(ConflictError);
    });

    it('blocks cancellation when the leave starts today with ConflictError', async () => {
      // startDate <= today (same UTC day) is not "strictly in the future".
      await repository.create(
        makeRequest({ startDate: new Date(), endDate: new Date(Date.now() + 24 * 60 * 60 * 1000) })
      );
      await expect(service.cancel(makeActor(), 'lr-1')).rejects.toThrow(ConflictError);
    });

    it('rejects a missing actor with UnauthorizedError', async () => {
      await repository.create(
        makeRequest({ startDate: FUTURE_START, endDate: FUTURE_END })
      );
      await expect(
        service.cancel({ id: '', role: EmployeeRole.EMPLOYEE }, 'lr-1')
      ).rejects.toThrow(UnauthorizedError);
    });

    it('rejects an invalid actor role with ForbiddenError', async () => {
      await repository.create(
        makeRequest({ startDate: FUTURE_START, endDate: FUTURE_END })
      );
      await expect(
        service.cancel({ id: REQUESTER_ID, role: 'GUEST' as EmployeeRole }, 'lr-1')
      ).rejects.toThrow(ForbiddenError);
    });

    it('rejects an unknown request with NotFoundError', async () => {
      await expect(service.cancel(makeActor(), 'missing')).rejects.toThrow(NotFoundError);
    });
  });

  // -------------------------------------------------------------------------
  // GP-008 — cancelling an APPROVED request inserts a terminal reversal row and
  // leaves the immutable approved row byte-identical.
  // -------------------------------------------------------------------------
  describe('cancel (APPROVED reversal)', () => {
    const manager = makeActor({ id: MANAGER_ID, role: EmployeeRole.MANAGER });
    const FUTURE_START = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const FUTURE_END = new Date(Date.now() + 32 * 24 * 60 * 60 * 1000);
    const APPROVER_ID = MANAGER_ID;
    const APPROVAL_COMMENT = 'Approved — enjoy the break';
    const DECIDED_AT = new Date('2024-05-20T10:00:00Z');

    beforeEach(async () => {
      await balanceRepository.create(makeBalance());
      // The approved request has already consumed its days from the balance.
      await balanceRepository.update('balance-1', { usedDays: REQUESTED_DAYS });
      await repository.create(
        makeRequest({
          status: LeaveStatus.APPROVED,
          startDate: FUTURE_START,
          endDate: FUTURE_END,
          submittedAt: new Date('2024-05-01T09:00:00Z'),
          approverId: APPROVER_ID,
          approvalComment: APPROVAL_COMMENT,
          decidedAt: DECIDED_AT,
        })
      );
      balanceRepository.updateCalls.length = 0;
      balanceRepository.findByKeyCalls.length = 0;
      repository.createCalls.length = 0;
      repository.updateCalls.length = 0;
    });

    it('leaves the original APPROVED row immutable and inserts a new CANCELLED reversal', async () => {
      const original = repository.rows[0];
      const originalStatus = original.status;
      const originalApproverId = original.approverId;
      const originalApprovalComment = original.approvalComment;
      const originalDecidedAt = original.decidedAt;

      const reversal = await service.cancel(manager, 'lr-1');

      // The original is never handed to update: no in-place mutation at all.
      expect(repository.updateCalls).toHaveLength(0);

      // The stored original is byte-identical and still readable as APPROVED.
      const stored = repository.rows.find((r) => r.id === 'lr-1');
      expect(stored).toBe(original);
      expect(stored!.status).toBe(LeaveStatus.APPROVED);
      expect(stored!.status).toBe(originalStatus);
      expect(stored!.approverId).toBe(APPROVER_ID);
      expect(stored!.approverId).toBe(originalApproverId);
      expect(stored!.approvalComment).toBe(APPROVAL_COMMENT);
      expect(stored!.approvalComment).toBe(originalApprovalComment);
      expect(stored!.decidedAt).toBe(DECIDED_AT);
      expect(stored!.decidedAt).toBe(originalDecidedAt);

      // A NEW row was created, never the original.
      expect(repository.createCalls).toHaveLength(1);
      expect(reversal.id).not.toBe(original.id);
      expect(reversal.status).toBe(LeaveStatus.CANCELLED);
      expect(reversal.reversesRequestId).toBe(original.id);
    });

    it('copies the full request shape verbatim and nulls the approval provenance', async () => {
      const original = repository.rows[0];
      const reversal = await service.cancel(manager, 'lr-1');

      expect(reversal.employeeId).toBe(original.employeeId);
      expect(reversal.leaveTypeCode).toBe(original.leaveTypeCode);
      expect(reversal.startDate).toBe(original.startDate);
      expect(reversal.endDate).toBe(original.endDate);
      expect(reversal.requestedDays).toBe(original.requestedDays);
      expect(reversal.reason).toBe(original.reason);

      // The reversal was never approved — copying the approver would read as a
      // second approval decision and would double-count in "decided" reports.
      expect(reversal.approverId).toBeNull();
      expect(reversal.approvalComment).toBeNull();
      expect(reversal.submittedAt).toBeNull();
      expect(reversal.decidedAt).toBeNull();

      expect(reversal.cancelledBy).toBe(manager.id);
      expect(reversal.cancelledAt).toBeInstanceOf(Date);
    });

    it('releases the ORIGINAL requestedDays from usedDays exactly once, pendingDays untouched', async () => {
      await service.cancel(manager, 'lr-1');

      expect(balanceRepository.updateCalls).toHaveLength(1);
      expect(balanceRepository.updateCalls[0].changes.usedDays).toBe(0);
      expect(balanceRepository.updateCalls[0].changes.usedDays).toBe(
        REQUESTED_DAYS - REQUESTED_DAYS
      );
      expect(balanceRepository.updateCalls[0].changes.pendingDays).toBeUndefined();
    });

    it('writes exactly one CANCEL audit entry against the ORIGINAL id', async () => {
      const original = repository.rows[0];
      const reversal = await service.cancel(manager, 'lr-1');

      expect(auditService.records).toHaveLength(1);
      const record = auditService.records[0];
      expect(record.action).toBe(AuditAction.CANCEL);
      expect(record.entityId).toBe(original.id);
      expect(record.beforeState).toBe(original);
      expect(record.afterState).toBe(reversal);
    });

    it('sends exactly two cancellation notifications, one per recipient', async () => {
      await service.cancel(manager, 'lr-1');

      expect(notificationService.inputs).toHaveLength(2);

      const requesterNotification = notificationService.inputs[0];
      expect(requesterNotification.type).toBe('leave_request');
      expect(requesterNotification.title).toBe('Leave request cancelled');
      expect(requesterNotification.recipientId).toBe(REQUESTER_ID);
      expect(requesterNotification.relatedEntityId).toBe('lr-1');

      const approverNotification = notificationService.inputs[1];
      expect(approverNotification.type).toBe('leave_request');
      expect(approverNotification.title).toBe('Leave request cancelled');
      expect(approverNotification.recipientId).toBe(MANAGER_ID);
      expect(approverNotification.relatedEntityId).toBe('lr-1');
      expect(approverNotification.relatedEntityCode).toBe('annual');
    });

    it('runs every participating call inside the single transaction with the forwarded client', async () => {
      await service.cancel(manager, 'lr-1');

      expect(uow.callCount).toBe(1);
      expect(repository.findReversesCalls).toHaveLength(1);
      expect(repository.findReversesCalls[0].reversesRequestId).toBe('lr-1');
      expect(repository.findReversesCalls[0].client).toBe(uow.stubClient);
      expect(repository.createCalls[0].input.reversesRequestId).toBe('lr-1');
      expect(repository.createCalls[0].client).toBe(uow.stubClient);
      // The balance is read FOR UPDATE before it is written, inside the same tx.
      expect(balanceRepository.findByKeyCalls.some((c) => c.forUpdate)).toBe(true);
      expect(balanceRepository.findByKeyCalls.every((c) => c.client === uow.stubClient)).toBe(
        true
      );
      expect(balanceRepository.updateCalls[0].client).toBe(uow.stubClient);
      expect(auditService.recordClients[0]).toBe(uow.stubClient);
      expect(notificationService.createClients[0]).toBe(uow.stubClient);
    });

    it('never hands the immutable original to update, not even by id', async () => {
      const original = repository.rows[0];
      await service.cancel(manager, 'lr-1');

      expect(repository.updateCalls.some((c) => c.id === original.id)).toBe(false);
    });

    it('blocks a second cancellation of an already-reversed original with ConflictError and no writes', async () => {
      // The previously-created reversal makes findByReversesRequestId non-null.
      await repository.create(
        makeRequest({
          id: 'lr-reversal',
          status: LeaveStatus.CANCELLED,
          startDate: FUTURE_START,
          endDate: FUTURE_END,
          cancelledBy: MANAGER_ID,
          cancelledAt: new Date(),
          reversesRequestId: 'lr-1',
        })
      );
      const rowsBefore = repository.rows.length;
      const createsBefore = repository.createCalls.length;
      balanceRepository.updateCalls.length = 0;

      await expect(service.cancel(manager, 'lr-1')).rejects.toThrow(ConflictError);

      // No insert, no balance write, no audit, no notification.
      expect(repository.rows.length).toBe(rowsBefore);
      expect(repository.createCalls.length).toBe(createsBefore);
      expect(balanceRepository.updateCalls).toHaveLength(0);
      expect(auditService.records).toHaveLength(0);
      expect(notificationService.inputs).toHaveLength(0);
    });

    it('the ConflictError carries a 409 status', async () => {
      await repository.create(
        makeRequest({
          id: 'lr-reversal',
          status: LeaveStatus.CANCELLED,
          startDate: FUTURE_START,
          endDate: FUTURE_END,
          cancelledBy: MANAGER_ID,
          cancelledAt: new Date(),
          reversesRequestId: 'lr-1',
        })
      );

      await expect(service.cancel(manager, 'lr-1')).rejects.toMatchObject({ statusCode: 409 });
    });

    it('cancels DRAFT in place with no reversal row and reversesRequestId stays null', async () => {
      repository.rows.length = 0;
      await repository.create(
        makeRequest({ id: 'lr-draft', startDate: FUTURE_START, endDate: FUTURE_END })
      );
      const createsBefore = repository.createCalls.length;

      const cancelled = await service.cancel(makeActor(), 'lr-draft');

      expect(cancelled.status).toBe(LeaveStatus.CANCELLED);
      expect(cancelled.reversesRequestId).toBeNull();
      // No reversal row was inserted.
      expect(repository.createCalls.length).toBe(createsBefore);
      expect(repository.rows.filter((r) => r.reversesRequestId !== null)).toHaveLength(0);
      // Cancelled in place, not by a new row.
      expect(repository.updateCalls).toHaveLength(1);
      expect(repository.updateCalls[0].id).toBe('lr-draft');
    });

    it('cancels SUBMITTED in place with no reversal row and reversesRequestId stays null', async () => {
      repository.rows.length = 0;
      await balanceRepository.update('balance-1', { usedDays: 0, pendingDays: REQUESTED_DAYS });
      await repository.create(
        makeRequest({
          id: 'lr-submitted',
          status: LeaveStatus.SUBMITTED,
          startDate: FUTURE_START,
          endDate: FUTURE_END,
        })
      );
      const createsBefore = repository.createCalls.length;

      const cancelled = await service.cancel(makeActor(), 'lr-submitted');

      expect(cancelled.status).toBe(LeaveStatus.CANCELLED);
      expect(cancelled.reversesRequestId).toBeNull();
      expect(repository.createCalls.length).toBe(createsBefore);
      expect(repository.rows.filter((r) => r.reversesRequestId !== null)).toHaveLength(0);
      expect(repository.updateCalls).toHaveLength(1);
      expect(repository.updateCalls[0].id).toBe('lr-submitted');
    });
  });

  // -------------------------------------------------------------------------
  // Cancel notifications: recipient resolution, missing-recipient tolerance and
  // the "always notify" rule when the actor IS the resolved recipient.
  // -------------------------------------------------------------------------
  describe('cancel notifications', () => {
    const manager = makeActor({ id: MANAGER_ID, role: EmployeeRole.MANAGER });
    const admin = makeActor({ id: 'admin-1', role: EmployeeRole.ADMIN });
    const FUTURE_START = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const FUTURE_END = new Date(Date.now() + 32 * 24 * 60 * 60 * 1000);

    beforeEach(async () => {
      await balanceRepository.create(makeBalance());
    });

    it('notifies the requester AND the direct manager when the owner cancels a SUBMITTED request', async () => {
      await balanceRepository.update('balance-1', { pendingDays: REQUESTED_DAYS });
      await repository.create(
        makeRequest({
          status: LeaveStatus.SUBMITTED,
          startDate: FUTURE_START,
          endDate: FUTURE_END,
        })
      );

      await service.cancel(makeActor(), 'lr-1');

      expect(notificationService.inputs).toHaveLength(2);

      const requesterNotification = notificationService.inputs[0];
      expect(requesterNotification.recipientId).toBe(REQUESTER_ID);
      expect(requesterNotification.relatedEntityId).toBe('lr-1');
      expect(requesterNotification.relatedEntityCode).toBeUndefined();

      const approverNotification = notificationService.inputs[1];
      expect(approverNotification.recipientId).toBe(MANAGER_ID);
      expect(approverNotification.relatedEntityId).toBe('lr-1');
      // The canonical lowercase code is carried verbatim, never re-cased.
      expect(approverNotification.relatedEntityCode).toBe(LeaveTypeCode.ANNUAL);
      expect(approverNotification.relatedEntityCode).toBe('annual');
      expect(approverNotification.relatedEntityType).toBe('leave_request');
      expect(approverNotification.type).toBe('leave_request');

      expect(notificationService.createClients).toEqual([uow.stubClient, uow.stubClient]);
      expect(uow.callCount).toBe(1);
    });

    it('records a single CANCEL audit entry against the original request id', async () => {
      await balanceRepository.update('balance-1', { pendingDays: REQUESTED_DAYS });
      await repository.create(
        makeRequest({
          status: LeaveStatus.SUBMITTED,
          startDate: FUTURE_START,
          endDate: FUTURE_END,
        })
      );

      await service.cancel(makeActor(), 'lr-1');

      expect(auditService.records).toHaveLength(1);
      expect(auditService.records[0].action).toBe(AuditAction.CANCEL);
      expect(auditService.records[0].entityType).toBe(LEAVE_REQUEST_ENTITY_TYPE);
      expect(auditService.records[0].entityId).toBe('lr-1');
      expect(auditService.recordClients[0]).toBe(uow.stubClient);
    });

    it('notifies the ORIGINAL approver on the GP-008 reversal path, keyed to the original id', async () => {
      await balanceRepository.update('balance-1', { usedDays: REQUESTED_DAYS });
      await repository.create(
        makeRequest({
          status: LeaveStatus.APPROVED,
          startDate: FUTURE_START,
          endDate: FUTURE_END,
          approverId: MANAGER_ID,
        })
      );

      await service.cancel(admin, 'lr-1');

      expect(notificationService.inputs).toHaveLength(2);
      expect(notificationService.inputs[0].recipientId).toBe(REQUESTER_ID);

      const approverNotification = notificationService.inputs[1];
      expect(approverNotification.recipientId).toBe(MANAGER_ID);
      expect(approverNotification.relatedEntityId).toBe('lr-1');
      expect(approverNotification.relatedEntityCode).toBe(LeaveTypeCode.ANNUAL);
      expect(approverNotification.relatedEntityType).toBe('leave_request');
      expect(approverNotification.type).toBe('leave_request');

      // The notification is keyed to the ORIGINAL row, never the reversal row.
      const reversal = repository.rows.find((r) => r.reversesRequestId === 'lr-1');
      expect(reversal).toBeDefined();
      expect(notificationService.inputs[1].relatedEntityId).not.toBe(reversal!.id);
      expect(reversal!.id).not.toBe('lr-1');

      expect(notificationService.createClients).toEqual([uow.stubClient, uow.stubClient]);
      expect(uow.callCount).toBe(1);
    });

    it('records one CANCEL audit entry against the ORIGINAL id on the reversal path', async () => {
      await balanceRepository.update('balance-1', { usedDays: REQUESTED_DAYS });
      await repository.create(
        makeRequest({
          status: LeaveStatus.APPROVED,
          startDate: FUTURE_START,
          endDate: FUTURE_END,
          approverId: MANAGER_ID,
        })
      );

      await service.cancel(admin, 'lr-1');

      expect(auditService.records).toHaveLength(1);
      expect(auditService.records[0].action).toBe(AuditAction.CANCEL);
      expect(auditService.records[0].entityType).toBe(LEAVE_REQUEST_ENTITY_TYPE);
      expect(auditService.records[0].entityId).toBe('lr-1');
    });

    it('notifies both recipients when the direct manager cancels an APPROVED request', async () => {
      await balanceRepository.update('balance-1', { usedDays: REQUESTED_DAYS });
      await repository.create(
        makeRequest({
          status: LeaveStatus.APPROVED,
          startDate: FUTURE_START,
          endDate: FUTURE_END,
          approverId: MANAGER_ID,
        })
      );

      await service.cancel(manager, 'lr-1');

      expect(notificationService.inputs).toHaveLength(2);
      expect(notificationService.inputs[0].recipientId).toBe(REQUESTER_ID);
      expect(notificationService.inputs[1].recipientId).toBe(MANAGER_ID);
      expect(notificationService.createClients).toEqual([uow.stubClient, uow.stubClient]);
      expect(uow.callCount).toBe(1);
    });

    it('notifies only the requester when a DRAFT is cancelled', async () => {
      await repository.create(
        makeRequest({ startDate: FUTURE_START, endDate: FUTURE_END })
      );

      await service.cancel(makeActor(), 'lr-1');

      expect(notificationService.inputs).toHaveLength(1);
      expect(notificationService.inputs[0].recipientId).toBe(REQUESTER_ID);
      expect(notificationService.createClients).toEqual([uow.stubClient]);
    });

    it('still cancels and notifies only the requester when a SUBMITTED requester has no manager', async () => {
      employeeService = new FakeEmployeeService([
        makeEmployee(REQUESTER_ID, { managerId: null }),
        makeEmployee(MANAGER_ID, { role: EmployeeRole.MANAGER }),
      ]);
      service = new LeaveService(
        repository,
        balanceRepository,
        auditService,
        notificationService,
        validationService,
        employeeService,
        policyService,
        uow
      );
      await balanceRepository.update('balance-1', { pendingDays: REQUESTED_DAYS });
      await repository.create(
        makeRequest({
          status: LeaveStatus.SUBMITTED,
          startDate: FUTURE_START,
          endDate: FUTURE_END,
        })
      );

      const result = await service.cancel(makeActor(), 'lr-1');

      expect(result).toBeDefined();
      expect(result).not.toBeInstanceOf(ConflictError);
      expect(result.status).toBe(LeaveStatus.CANCELLED);
      expect(notificationService.inputs).toHaveLength(1);
      expect(notificationService.inputs[0].recipientId).toBe(REQUESTER_ID);

      expect(auditService.records).toHaveLength(1);
      const after = auditService.records[0].afterState as Record<string, unknown>;
      expect(after.approverNotificationSkipped).toBe(true);
    });

    it('still cancels and notifies only the requester when an APPROVED request has no approver', async () => {
      await balanceRepository.update('balance-1', { usedDays: REQUESTED_DAYS });
      await repository.create(
        makeRequest({
          status: LeaveStatus.APPROVED,
          startDate: FUTURE_START,
          endDate: FUTURE_END,
          approverId: null,
        })
      );

      const result = await service.cancel(admin, 'lr-1');

      expect(result).toBeDefined();
      expect(result).not.toBeInstanceOf(ConflictError);
      expect(result.status).toBe(LeaveStatus.CANCELLED);
      expect(notificationService.inputs).toHaveLength(1);
      expect(notificationService.inputs[0].recipientId).toBe(REQUESTER_ID);

      expect(auditService.records).toHaveLength(1);
      const after = auditService.records[0].afterState as Record<string, unknown>;
      expect(after.approverNotificationSkipped).toBe(true);
    });

    it('still notifies the approver when the actor IS the resolved approver recipient', async () => {
      await balanceRepository.update('balance-1', { usedDays: REQUESTED_DAYS });
      await repository.create(
        makeRequest({
          status: LeaveStatus.APPROVED,
          startDate: FUTURE_START,
          endDate: FUTURE_END,
          approverId: MANAGER_ID,
        })
      );

      await service.cancel(manager, 'lr-1');

      expect(notificationService.inputs).toHaveLength(2);
      expect(notificationService.inputs[1].recipientId).toBe(MANAGER_ID);
      expect(notificationService.createClients).toEqual([uow.stubClient, uow.stubClient]);
    });

    it('still notifies the owner when they are both canceller and resolved recipient', async () => {
      employeeService = new FakeEmployeeService([
        makeEmployee(REQUESTER_ID, { managerId: REQUESTER_ID }),
        makeEmployee(MANAGER_ID, { role: EmployeeRole.MANAGER }),
      ]);
      service = new LeaveService(
        repository,
        balanceRepository,
        auditService,
        notificationService,
        validationService,
        employeeService,
        policyService,
        uow
      );
      await balanceRepository.update('balance-1', { pendingDays: REQUESTED_DAYS });
      await repository.create(
        makeRequest({
          status: LeaveStatus.SUBMITTED,
          startDate: FUTURE_START,
          endDate: FUTURE_END,
        })
      );

      await service.cancel(makeActor(), 'lr-1');

      expect(notificationService.inputs).toHaveLength(2);
      expect(notificationService.inputs[1].recipientId).toBe(REQUESTER_ID);
      expect(notificationService.createClients).toEqual([uow.stubClient, uow.stubClient]);
    });

    it('carries the request id and the leave type code in the approver notification message', async () => {
      await balanceRepository.update('balance-1', { pendingDays: REQUESTED_DAYS });
      await repository.create(
        makeRequest({
          status: LeaveStatus.SUBMITTED,
          startDate: FUTURE_START,
          endDate: FUTURE_END,
        })
      );

      await service.cancel(makeActor(), 'lr-1');

      const requesterNotification = notificationService.inputs[0];
      const approverNotification = notificationService.inputs[1];
      // The column is the contract; the message is the human-readable echo of it.
      expect(requesterNotification.message).toContain('lr-1');
      expect(approverNotification.message).toContain('lr-1');
      expect(approverNotification.message).toContain(LeaveTypeCode.ANNUAL);
    });

    it('writes the row in place with an UNMARKED audit entry when a recipient resolves', async () => {
      await balanceRepository.update('balance-1', { pendingDays: REQUESTED_DAYS });
      await repository.create(
        makeRequest({
          status: LeaveStatus.SUBMITTED,
          startDate: FUTURE_START,
          endDate: FUTURE_END,
        })
      );

      await service.cancel(makeActor(), 'lr-1');

      // SUBMITTED is cancelled in place: one update, no reversal row.
      expect(repository.updateCalls).toHaveLength(1);
      expect(repository.rows.filter((r) => r.reversesRequestId !== null)).toHaveLength(0);

      expect(auditService.records).toHaveLength(1);
      expect(auditService.records[0].action).toBe(AuditAction.CANCEL);
      expect(auditService.records[0].entityType).toBe(LEAVE_REQUEST_ENTITY_TYPE);
      expect(auditService.records[0].entityId).toBe('lr-1');
      const after = auditService.records[0].afterState as Record<string, unknown>;
      expect(after.status).toBe(LeaveStatus.CANCELLED);
      // Nothing was skipped, so the skip marker is absent rather than false.
      expect(after.approverNotificationSkipped).toBeUndefined();
    });

    it('keys the approver notification to the original id while the reversal row has a null approverId', async () => {
      await balanceRepository.update('balance-1', { usedDays: REQUESTED_DAYS });
      await repository.create(
        makeRequest({
          status: LeaveStatus.APPROVED,
          startDate: FUTURE_START,
          endDate: FUTURE_END,
          approverId: MANAGER_ID,
        })
      );

      await service.cancel(admin, 'lr-1');

      // The immutable original is never touched.
      expect(repository.rows.find((r) => r.id === 'lr-1')?.status).toBe(LeaveStatus.APPROVED);

      const reversal = repository.rows.find((r) => r.reversesRequestId === 'lr-1');
      expect(reversal).toBeDefined();
      expect(reversal?.approverId).toBeNull();

      expect(notificationService.inputs).toHaveLength(2);
      const approverNotification = notificationService.inputs[1];
      // Read from the ORIGINAL row, keyed to the ORIGINAL id — the reversal row
      // carries a null approverId by construction, so reading it there would drop
      // every notification on this path.
      expect(approverNotification.recipientId).toBe(MANAGER_ID);
      expect(approverNotification.relatedEntityId).toBe('lr-1');
      expect(approverNotification.relatedEntityId).not.toBe(reversal?.id);
      expect(approverNotification.relatedEntityCode).toBe(LeaveTypeCode.ANNUAL);
      expect(approverNotification.relatedEntityType).toBe('leave_request');
      expect(approverNotification.type).toBe('leave_request');
      expect(notificationService.createClients).toEqual([uow.stubClient, uow.stubClient]);
      expect(uow.callCount).toBe(1);
    });

    it('records the unchanged CANCEL entry alongside the skip marker when the requester has no manager', async () => {
      employeeService = new FakeEmployeeService([
        makeEmployee(REQUESTER_ID, { managerId: null }),
        makeEmployee(MANAGER_ID, { role: EmployeeRole.MANAGER }),
      ]);
      service = new LeaveService(
        repository,
        balanceRepository,
        auditService,
        notificationService,
        validationService,
        employeeService,
        policyService,
        uow
      );
      await balanceRepository.update('balance-1', { pendingDays: REQUESTED_DAYS });
      await repository.create(
        makeRequest({
          status: LeaveStatus.SUBMITTED,
          startDate: FUTURE_START,
          endDate: FUTURE_END,
        })
      );

      await service.cancel(makeActor(), 'lr-1');

      expect(auditService.records).toHaveLength(1);
      const entry = auditService.records[0];
      expect(entry.action).toBe(AuditAction.CANCEL);
      expect(entry.entityType).toBe(LEAVE_REQUEST_ENTITY_TYPE);
      expect(entry.entityId).toBe('lr-1');
      expect(entry.beforeState).toMatchObject({
        id: 'lr-1',
        status: LeaveStatus.SUBMITTED,
      });
      const after = entry.afterState as Record<string, unknown>;
      expect(after.status).toBe(LeaveStatus.CANCELLED);
      expect(after.approverNotificationSkipped).toBe(true);

      // The skip suppresses only the approver notification — the cancellation and
      // its single requester notification still happen, in one unit of work.
      expect(notificationService.inputs).toHaveLength(1);
      expect(notificationService.inputs[0].recipientId).toBe(REQUESTER_ID);
      expect(notificationService.createClients).toEqual([uow.stubClient]);
      expect(repository.rows.filter((r) => r.reversesRequestId !== null)).toHaveLength(0);
      expect(uow.callCount).toBe(1);
    });
  });

  // -------------------------------------------------------------------------
  // listPendingDecisions — a status-filtered read that mirrors list's role
  // scoping and hands the repository's array back untouched.
  // -------------------------------------------------------------------------
  describe('listPendingDecisions', () => {
    const manager = makeActor({ id: MANAGER_ID, role: EmployeeRole.MANAGER });
    const admin = makeActor({ id: 'admin-1', role: EmployeeRole.ADMIN });

    it('lets an ADMIN read every SUBMITTED decision with no employee filter', async () => {
      await repository.create(
        makeRequest({ id: 'lr-a', employeeId: 'emp-a', status: LeaveStatus.SUBMITTED })
      );
      await repository.create(
        makeRequest({ id: 'lr-b', employeeId: 'emp-b', status: LeaveStatus.SUBMITTED })
      );
      // The SUBMITTED-only predicate belongs to the repository, not the service.
      await repository.create(
        makeRequest({ id: 'lr-draft', employeeId: 'emp-a', status: LeaveStatus.DRAFT })
      );
      await repository.create(
        makeRequest({ id: 'lr-approved', employeeId: 'emp-b', status: LeaveStatus.APPROVED })
      );

      const result = await service.listPendingDecisions(admin);

      expect(repository.findPendingCalls).toHaveLength(1);
      expect(repository.findPendingCalls[0]).toBeUndefined();
      expect(result.map((d) => d.requestId).sort()).toEqual(['lr-a', 'lr-b']);
      expect(result.every((d) => d.status === LeaveStatus.SUBMITTED)).toBe(true);
      expect(uow.callCount).toBe(0);
    });

    it('scopes a MANAGER to their own id plus their direct reports', async () => {
      employeeService = new FakeEmployeeService([
        makeEmployee(REQUESTER_ID, { managerId: MANAGER_ID }),
        makeEmployee(MANAGER_ID, { role: EmployeeRole.MANAGER, managerId: null }),
      ]);
      service = new LeaveService(
        repository,
        balanceRepository,
        auditService,
        notificationService,
        validationService,
        employeeService,
        policyService,
        uow
      );
      await repository.create(
        makeRequest({ id: 'lr-report', employeeId: REQUESTER_ID, status: LeaveStatus.SUBMITTED })
      );
      await repository.create(
        makeRequest({ id: 'lr-unrelated', employeeId: 'emp-999', status: LeaveStatus.SUBMITTED })
      );

      const result = await service.listPendingDecisions(manager);

      expect(repository.findPendingCalls).toHaveLength(1);
      expect(repository.findPendingCalls[0]).toEqual([MANAGER_ID, REQUESTER_ID]);
      expect(result.map((d) => d.requestId)).toEqual(['lr-report']);
      expect(uow.callCount).toBe(0);
    });

    it('returns the repository array verbatim — no copy, no re-sort, no filter', async () => {
      const later: PendingDecision = {
        requestId: 'lr-later',
        employeeId: REQUESTER_ID,
        leaveTypeCode: LeaveTypeCode.ANNUAL,
        startDate: new Date('2024-08-01T00:00:00Z'),
        endDate: new Date('2024-08-03T00:00:00Z'),
        requestedDays: REQUESTED_DAYS,
        status: LeaveStatus.SUBMITTED,
      };
      const earlier: PendingDecision = {
        ...later,
        requestId: 'lr-earlier',
        startDate: new Date('2024-07-01T00:00:00Z'),
        endDate: new Date('2024-07-03T00:00:00Z'),
      };
      // Deliberately non-sorted (later startDate first) and distinct from the
      // rows the repository would otherwise project.
      repository.pendingOverride = [later, earlier];

      const result = await service.listPendingDecisions(admin);

      expect(result).toEqual(repository.pendingOverride);
      expect(result).toBe(repository.pendingOverride);
      expect(result.map((d) => d.requestId)).toEqual(['lr-later', 'lr-earlier']);
      expect(uow.callCount).toBe(0);
    });

    it('resolves to an empty array rather than throwing when nothing is pending', async () => {
      repository.pendingOverride = [];

      await expect(service.listPendingDecisions(admin)).resolves.toEqual([]);
      expect(uow.callCount).toBe(0);
    });

    it('does not open a transaction or forward a client to the repository', async () => {
      repository.pendingOverride = [];

      await service.listPendingDecisions(admin);

      expect(uow.callCount).toBe(0);
      // findPendingDecisions takes only employeeIds — no client argument exists.
      expect(repository.findPendingCalls).toEqual([undefined]);
    });

    it('rejects a missing actor with UnauthorizedError and opens no transaction', async () => {
      await expect(
        service.listPendingDecisions({ id: '', role: EmployeeRole.EMPLOYEE })
      ).rejects.toThrow(UnauthorizedError);
      expect(uow.callCount).toBe(0);
    });

    it('passes NO scoping filter for an ADMIN, so the repository decides membership', async () => {
      await repository.create(
        makeRequest({ id: 'lr-x', employeeId: 'emp-x', status: LeaveStatus.SUBMITTED })
      );
      await repository.create(
        makeRequest({ id: 'lr-y', employeeId: 'emp-y', status: LeaveStatus.SUBMITTED })
      );

      const result = await service.listPendingDecisions(admin);

      // Exactly one call, and the scoping argument is absent (not an empty list):
      // an empty array would be a filter that matches nothing.
      expect(repository.findPendingCalls).toHaveLength(1);
      expect(repository.findPendingCalls[0]).toBeUndefined();
      expect(repository.findPendingCalls[0]).not.toEqual([]);
      // Every SUBMITTED request is visible regardless of who requested it.
      expect(result.map((d) => d.employeeId).sort()).toEqual(['emp-x', 'emp-y']);
    });

    it('scopes a MANAGER to exactly their own id plus their direct reports', async () => {
      employeeService = new FakeEmployeeService([
        makeEmployee(REQUESTER_ID, { managerId: MANAGER_ID }),
        makeEmployee('emp-report-2', { managerId: MANAGER_ID }),
        makeEmployee(MANAGER_ID, { role: EmployeeRole.MANAGER, managerId: null }),
        makeEmployee('emp-other', { managerId: 'mgr-other' }),
      ]);
      service = new LeaveService(
        repository,
        balanceRepository,
        auditService,
        notificationService,
        validationService,
        employeeService,
        policyService,
        uow
      );

      await service.listPendingDecisions(manager);

      expect(repository.findPendingCalls).toHaveLength(1);
      expect(repository.findPendingCalls[0]).toEqual([MANAGER_ID, REQUESTER_ID, 'emp-report-2']);
      // A non-report's manager is never in scope.
      expect(repository.findPendingCalls[0]).not.toContain('mgr-other');
      expect(repository.findPendingCalls[0]).not.toContain('emp-other');
    });

    it('scopes an EMPLOYEE to only their own id', async () => {
      const employee = makeActor({ id: REQUESTER_ID, role: EmployeeRole.EMPLOYEE });

      await service.listPendingDecisions(employee);

      expect(repository.findPendingCalls).toEqual([[REQUESTER_ID]]);
      expect(uow.callCount).toBe(0);
    });

    it('hands back the repository array deep-equal, order preserved, with no re-sort', async () => {
      const first: PendingDecision = {
        requestId: 'lr-first',
        employeeId: REQUESTER_ID,
        leaveTypeCode: LeaveTypeCode.ANNUAL,
        startDate: new Date('2024-09-01T00:00:00Z'),
        endDate: new Date('2024-09-05T00:00:00Z'),
        requestedDays: REQUESTED_DAYS,
        status: LeaveStatus.SUBMITTED,
      };
      const second: PendingDecision = {
        ...first,
        requestId: 'lr-second',
        startDate: new Date('2024-07-01T00:00:00Z'),
        endDate: new Date('2024-07-02T00:00:00Z'),
      };
      const third: PendingDecision = {
        ...first,
        requestId: 'lr-third',
        employeeId: 'emp-999',
        startDate: new Date('2024-08-01T00:00:00Z'),
        endDate: new Date('2024-08-02T00:00:00Z'),
      };
      // startDate order deliberately scrambled: the service must not impose the
      // start_date ASC ordering the repository owns.
      repository.pendingOverride = [first, second, third];

      const result = await service.listPendingDecisions(admin);

      expect(result).toEqual([first, second, third]);
      expect(result.map((d) => d.requestId)).toEqual(['lr-first', 'lr-second', 'lr-third']);
      expect(result).toBe(repository.pendingOverride);
    });

    it('returns an empty array — not an error — when the queue is empty', async () => {
      repository.pendingOverride = [];

      const result = await service.listPendingDecisions(manager);

      await expect(service.listPendingDecisions(admin)).resolves.toEqual([]);
      expect(result).toEqual([]);
      expect(Array.isArray(result)).toBe(true);
    });

    it('opens no unit of work and forwards no client for any role', async () => {
      employeeService = new FakeEmployeeService([
        makeEmployee(REQUESTER_ID, { managerId: MANAGER_ID }),
        makeEmployee(MANAGER_ID, { role: EmployeeRole.MANAGER, managerId: null }),
      ]);
      service = new LeaveService(
        repository,
        balanceRepository,
        auditService,
        notificationService,
        validationService,
        employeeService,
        policyService,
        uow
      );
      repository.pendingOverride = [];

      await service.listPendingDecisions(admin);
      await service.listPendingDecisions(manager);

      expect(uow.callCount).toBe(0);
      // findPendingDecisions accepts only employeeIds — no client is forwarded.
      expect(repository.findPendingCalls).toEqual([undefined, [MANAGER_ID, REQUESTER_ID]]);
    });

    it('rejects an absent actor with UnauthorizedError before touching the repository', async () => {
      await expect(
        service.listPendingDecisions(undefined as unknown as LeaveActor)
      ).rejects.toThrow(UnauthorizedError);

      expect(repository.findPendingCalls).toHaveLength(0);
      expect(uow.callCount).toBe(0);
    });
  });
});

// ---------------------------------------------------------------------------
// Regression: leave-balance race + create atomicity
// ---------------------------------------------------------------------------

describe('LeaveService concurrency and atomicity guarantees', () => {
  let repository: FakeLeaveRepository;
  let balanceRepository: FakeBalanceRepository;
  let auditService: FakeAuditService;
  let uow: FakeUnitOfWork;
  let service: LeaveService;

  beforeEach(async () => {
    repository = new FakeLeaveRepository();
    balanceRepository = new FakeBalanceRepository();
    auditService = new FakeAuditService();
    uow = new FakeUnitOfWork();
    service = new LeaveService(
      repository,
      balanceRepository,
      auditService,
      new FakeNotificationService(),
      new FakeValidationService(),
      new FakeEmployeeService([
        makeEmployee(REQUESTER_ID),
        makeEmployee(MANAGER_ID, { role: EmployeeRole.MANAGER }),
      ]),
      new FakePolicyService([makePolicy()]),
      uow
    );
    await balanceRepository.create(makeBalance());
  });

  const manager = () => makeActor({ id: MANAGER_ID, role: EmployeeRole.MANAGER });

  async function seedRequest(status: LeaveStatus): Promise<void> {
    await repository.create({
      employeeId: REQUESTER_ID,
      leaveTypeCode: LeaveTypeCode.ANNUAL,
      startDate: START,
      endDate: END,
      requestedDays: REQUESTED_DAYS,
      reason: null,
      status,
      approverId: null,
      approvalComment: null,
      submittedAt: null,
      decidedAt: null,
      cancelledBy: null,
      cancelledAt: null,
      reversesRequestId: null,
    });
  }

  // The deltas are computed in application code (read pendingDays, adjust, write the
  // result). Without a row lock two concurrent transactions read the same value and
  // the second write discards the first — READ COMMITTED permits exactly this, so
  // being inside a transaction is not sufficient.
  it.each([
    ['submit', LeaveStatus.DRAFT, (s: LeaveService) => s.submit(makeActor(), 'lr-1')],
    ['approve', LeaveStatus.SUBMITTED, (s: LeaveService) => s.approve(manager(), 'lr-1')],
    ['reject', LeaveStatus.SUBMITTED, (s: LeaveService) => s.reject(manager(), 'lr-1')],
  ])('%s locks the balance row it goes on to write', async (_op, status, run) => {
    await seedRequest(status);
    if (status === LeaveStatus.SUBMITTED) {
      // approve/reject consume days that submit had already reserved
      await balanceRepository.update(balanceRepository.rows[0].id, {
        pendingDays: REQUESTED_DAYS,
      });
    }
    balanceRepository.findByKeyCalls.length = 0;
    balanceRepository.updateCalls.length = 0;

    await run(service);

    const transactional = balanceRepository.findByKeyCalls.filter(
      (c) => c.client !== undefined
    );
    expect(transactional.length).toBeGreaterThan(0);
    for (const call of transactional) {
      expect(call.forUpdate).toBe(true);
    }
    // and it really did write the row it locked
    expect(balanceRepository.updateCalls.length).toBeGreaterThan(0);
  });

  it('does not lock the balance on create — that read only validates', async () => {
    balanceRepository.findByKeyCalls.length = 0;
    await service.create(makeActor(), makeDto());
    expect(balanceRepository.findByKeyCalls.length).toBeGreaterThan(0);
    for (const call of balanceRepository.findByKeyCalls) {
      expect(call.forUpdate).toBeFalsy();
    }
  });

  // Written outside a transaction, a failing audit insert leaves a persisted request
  // with no audit trail — and create was the only mutation here that was unwrapped.
  it('writes the request and its audit record in ONE unit of work', async () => {
    await service.create(makeActor(), makeDto());

    expect(uow.callCount).toBe(1);
    const client = repository.createCalls[0]?.client;
    expect(client).toBe(uow.stubClient);
    expect(auditService.recordClients[0]).toBe(client);
  });

  it('unwinds the whole create when the audit write fails', async () => {
    auditService.failNext = true;
    await expect(service.create(makeActor(), makeDto())).rejects.toThrow('audit insert failed');
    expect(uow.rolledBack).toBe(true);
  });
});
