import { PoolClient } from 'pg';
import {
  LeaveService,
  LeaveActor,
  ILeaveRepository,
  LeaveRequest,
  CreateLeaveRequestInput,
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
} from '../../../../src/shared/types';

// ---------------------------------------------------------------------------
// Fakes
// ---------------------------------------------------------------------------

class FakeLeaveRepository implements ILeaveRepository {
  rows: LeaveRequest[] = [];
  createCalls: { input: CreateLeaveRequestInput; client?: PoolClient }[] = [];
  updateCalls: { id: string; changes: UpdateLeaveRequestDto; client?: PoolClient }[] = [];
  findByIdCalls: { id: string; client?: PoolClient }[] = [];
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
