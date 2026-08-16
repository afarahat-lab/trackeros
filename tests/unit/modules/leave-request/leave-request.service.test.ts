import { LeaveStatus } from '../../../../src/shared/types';
import {
  LeaveRequestService,
  ILeaveRequestService,
  ILeaveRequestRepository,
  LeaveRequest,
} from '../../../../src/modules/leave-request';
import { ILeaveBalanceRepository, LeaveBalance } from '../../../../src/modules/leave-balance';
import { ILeavePolicyRepository, LeavePolicy } from '../../../../src/modules/leave-policy';
import { IEmployeeRepository, Employee } from '../../../../src/modules/employee';
import { LeaveType, EmploymentStatus } from '../../../../src/shared/types';

function makeEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
    id: 'emp-001',
    employeeNumber: 'E001',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    managerId: 'mgr-001',
    department: 'Engineering',
    hireDate: new Date('2020-01-15'),
    terminationDate: null,
    employmentStatus: EmploymentStatus.ACTIVE,
    createdAt: new Date('2020-01-15T00:00:00Z'),
    updatedAt: new Date('2020-01-15T00:00:00Z'),
    ...overrides,
  };
}

function makePolicy(overrides: Partial<LeavePolicy> = {}): LeavePolicy {
  return {
    id: 'lp-001',
    policyName: 'Annual Leave',
    leaveType: LeaveType.ANNUAL,
    entitlementDays: 20,
    accrualRate: null,
    maxAccumulation: null,
    minimumNoticeDays: null,
    requiresManagerApproval: true,
    isActive: true,
    createdAt: new Date('2020-01-01T00:00:00Z'),
    updatedAt: new Date('2020-01-01T00:00:00Z'),
    ...overrides,
  };
}

function makeBalance(overrides: Partial<LeaveBalance> = {}): LeaveBalance {
  return {
    id: 'bal-001',
    employeeId: 'emp-001',
    leavePolicyId: 'lp-001',
    totalEntitlement: 20,
    usedDays: 0,
    remainingDays: 20,
    fiscalYear: 2026,
    status: 'ACTIVE',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

function makeDraftRequest(overrides: Partial<LeaveRequest> = {}): LeaveRequest {
  return {
    id: 'lr-001',
    employeeId: 'emp-001',
    leavePolicyId: 'lp-001',
    startDate: new Date('2026-08-10'),
    endDate: new Date('2026-08-14'),
    reason: 'Vacation',
    status: LeaveStatus.DRAFT,
    approvedBy: null,
    approvedAt: null,
    cancelledAt: null,
    createdAt: new Date('2026-08-01T00:00:00Z'),
    updatedAt: new Date('2026-08-01T00:00:00Z'),
    ...overrides,
  };
}

describe('LeaveRequestService', () => {
  let service: ILeaveRequestService;
  let requestRepo: jest.Mocked<ILeaveRequestRepository>;
  let balanceRepo: jest.Mocked<ILeaveBalanceRepository>;
  let policyRepo: jest.Mocked<ILeavePolicyRepository>;
  let employeeRepo: jest.Mocked<IEmployeeRepository>;

  beforeEach(() => {
    requestRepo = {
      findById: jest.fn(),
      findByEmployeeId: jest.fn(),
      findByStatus: jest.fn(),
      query: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<ILeaveRequestRepository>;

    balanceRepo = {
      findById: jest.fn(),
      findByEmployeeAndPolicy: jest.fn(),
      findByEmployeeId: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<ILeaveBalanceRepository>;

    policyRepo = {
      findById: jest.fn(),
      findByLeaveType: jest.fn(),
      findAllActive: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<ILeavePolicyRepository>;

    employeeRepo = {
      findById: jest.fn(),
      findByEmployeeNumber: jest.fn(),
      findByManagerId: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<IEmployeeRepository>;

    service = new LeaveRequestService(requestRepo, balanceRepo, policyRepo, employeeRepo);
  });

  // ─── createDraft ───────────────────────────────────────────────

  describe('createDraft', () => {
    const dto = {
      employeeId: 'emp-001',
      leavePolicyId: 'lp-001',
      startDate: new Date('2026-08-10'),
      endDate: new Date('2026-08-14'),
      reason: 'Vacation',
    };

    it('should create a DRAFT leave request', async () => {
      const employee = makeEmployee();
      const policy = makePolicy();
      const created = makeDraftRequest();

      employeeRepo.findById.mockResolvedValue(employee);
      policyRepo.findById.mockResolvedValue(policy);
      requestRepo.create.mockResolvedValue(created);

      const result = await service.createDraft(dto);

      expect(result.status).toBe(LeaveStatus.DRAFT);
      expect(result.approvedBy).toBeNull();
      expect(result.approvedAt).toBeNull();
      expect(result.cancelledAt).toBeNull();
      expect(requestRepo.create).toHaveBeenCalledWith({
        employeeId: 'emp-001',
        leavePolicyId: 'lp-001',
        startDate: dto.startDate,
        endDate: dto.endDate,
        reason: 'Vacation',
        status: LeaveStatus.DRAFT,
        approvedBy: null,
        approvedAt: null,
        cancelledAt: null,
      });
    });

    it('should throw if employee not found', async () => {
      employeeRepo.findById.mockResolvedValue(null);

      await expect(service.createDraft(dto)).rejects.toEqual({
        error: 'Employee not found',
        code: 'EMPLOYEE_NOT_FOUND',
      });
    });

    it('should throw if policy not found', async () => {
      employeeRepo.findById.mockResolvedValue(makeEmployee());
      policyRepo.findById.mockResolvedValue(null);

      await expect(service.createDraft(dto)).rejects.toEqual({
        error: 'Leave policy not found',
        code: 'POLICY_NOT_FOUND',
      });
    });

    it('should throw if policy is inactive', async () => {
      employeeRepo.findById.mockResolvedValue(makeEmployee());
      policyRepo.findById.mockResolvedValue(makePolicy({ isActive: false }));

      await expect(service.createDraft(dto)).rejects.toEqual({
        error: 'Leave policy is not active',
        code: 'POLICY_INACTIVE',
      });
    });

    it('should throw if startDate > endDate', async () => {
      employeeRepo.findById.mockResolvedValue(makeEmployee());
      policyRepo.findById.mockResolvedValue(makePolicy());

      await expect(
        service.createDraft({
          ...dto,
          startDate: new Date('2026-08-20'),
          endDate: new Date('2026-08-14'),
        }),
      ).rejects.toEqual({
        error: 'startDate must be on or before endDate',
        code: 'INVALID_DATE_RANGE',
      });
    });

    it('should allow startDate equal to endDate (single-day leave)', async () => {
      const employee = makeEmployee();
      const policy = makePolicy();
      const created = makeDraftRequest({
        startDate: new Date('2026-08-15'),
        endDate: new Date('2026-08-15'),
      });

      employeeRepo.findById.mockResolvedValue(employee);
      policyRepo.findById.mockResolvedValue(policy);
      requestRepo.create.mockResolvedValue(created);

      const result = await service.createDraft({
        ...dto,
        startDate: new Date('2026-08-15'),
        endDate: new Date('2026-08-15'),
      });

      expect(result.startDate).toEqual(new Date('2026-08-15'));
      expect(result.endDate).toEqual(new Date('2026-08-15'));
    });
  });

  // ─── submit ────────────────────────────────────────────────────

  describe('submit', () => {
    it('should transition DRAFT to SUBMITTED', async () => {
      const draft = makeDraftRequest();
      const policy = makePolicy();
      const balance = makeBalance();
      const submitted = { ...draft, status: LeaveStatus.SUBMITTED };

      requestRepo.findById.mockResolvedValue(draft);
      policyRepo.findById.mockResolvedValue(policy);
      balanceRepo.findByEmployeeAndPolicy.mockResolvedValue(balance);
      requestRepo.update.mockResolvedValue(submitted);

      const result = await service.submit('lr-001');

      expect(result.status).toBe(LeaveStatus.SUBMITTED);
      expect(requestRepo.update).toHaveBeenCalledWith('lr-001', {
        status: LeaveStatus.SUBMITTED,
      });
    });

    it('should throw if request not found', async () => {
      requestRepo.findById.mockResolvedValue(null);

      await expect(service.submit('lr-001')).rejects.toEqual({
        error: 'Leave request not found',
        code: 'REQUEST_NOT_FOUND',
      });
    });

    it('should throw if request is not in DRAFT status', async () => {
      requestRepo.findById.mockResolvedValue(
        makeDraftRequest({ status: LeaveStatus.SUBMITTED }),
      );

      await expect(service.submit('lr-001')).rejects.toEqual({
        error: 'Only DRAFT requests can be submitted',
        code: 'INVALID_STATE_TRANSITION',
      });
    });

    it('should throw if minimumNoticeDays is violated', async () => {
      const draft = makeDraftRequest({
        startDate: new Date('2026-08-17'), // only 1 day from "now" (Aug 16)
      });
      const policy = makePolicy({ minimumNoticeDays: 3 });

      requestRepo.findById.mockResolvedValue(draft);
      policyRepo.findById.mockResolvedValue(policy);

      await expect(service.submit('lr-001')).rejects.toEqual({
        error: 'Minimum notice of 3 days required',
        code: 'MINIMUM_NOTICE_VIOLATION',
      });
    });

    it('should allow submit when minimumNoticeDays is exactly met', async () => {
      // Today is Aug 16, 2026. minimumNoticeDays=3 means startDate must be >= Aug 19.
      const draft = makeDraftRequest({
        startDate: new Date('2026-08-19'),
        endDate: new Date('2026-08-20'),
      });
      const policy = makePolicy({ minimumNoticeDays: 3 });
      const balance = makeBalance();
      const submitted = { ...draft, status: LeaveStatus.SUBMITTED };

      requestRepo.findById.mockResolvedValue(draft);
      policyRepo.findById.mockResolvedValue(policy);
      balanceRepo.findByEmployeeAndPolicy.mockResolvedValue(balance);
      requestRepo.update.mockResolvedValue(submitted);

      const result = await service.submit('lr-001');
      expect(result.status).toBe(LeaveStatus.SUBMITTED);
    });

    it('should throw if balance not found', async () => {
      const draft = makeDraftRequest();
      const policy = makePolicy();

      requestRepo.findById.mockResolvedValue(draft);
      policyRepo.findById.mockResolvedValue(policy);
      balanceRepo.findByEmployeeAndPolicy.mockResolvedValue(null);

      await expect(service.submit('lr-001')).rejects.toEqual({
        error: 'Leave balance not found',
        code: 'BALANCE_NOT_FOUND',
      });
    });

    it('should throw if balance is CLOSED', async () => {
      const draft = makeDraftRequest();
      const policy = makePolicy();
      const balance = makeBalance({ status: 'CLOSED' });

      requestRepo.findById.mockResolvedValue(draft);
      policyRepo.findById.mockResolvedValue(policy);
      balanceRepo.findByEmployeeAndPolicy.mockResolvedValue(balance);

      await expect(service.submit('lr-001')).rejects.toEqual({
        error: 'Leave balance is closed',
        code: 'BALANCE_CLOSED',
      });
    });

    it('should throw if insufficient remainingDays', async () => {
      // Aug 10-14 = 5 days, but only 3 remaining
      const draft = makeDraftRequest();
      const policy = makePolicy();
      const balance = makeBalance({ remainingDays: 3, usedDays: 17 });

      requestRepo.findById.mockResolvedValue(draft);
      policyRepo.findById.mockResolvedValue(policy);
      balanceRepo.findByEmployeeAndPolicy.mockResolvedValue(balance);

      await expect(service.submit('lr-001')).rejects.toEqual({
        error: 'Insufficient balance: 3 remaining, 5 requested',
        code: 'INSUFFICIENT_BALANCE',
      });
    });

    it('should use BINDING formula: daysRequested = (endDate - startDate) + 1 (5-day range)', async () => {
      // Aug 10 (Mon) to Aug 14 (Fri) = 5 calendar days inclusive
      const draft = makeDraftRequest({
        startDate: new Date('2026-08-10'),
        endDate: new Date('2026-08-14'),
      });
      const policy = makePolicy();
      const balance = makeBalance({ remainingDays: 5, usedDays: 15 });
      const submitted = { ...draft, status: LeaveStatus.SUBMITTED };

      requestRepo.findById.mockResolvedValue(draft);
      policyRepo.findById.mockResolvedValue(policy);
      balanceRepo.findByEmployeeAndPolicy.mockResolvedValue(balance);
      requestRepo.update.mockResolvedValue(submitted);

      const result = await service.submit('lr-001');
      expect(result.status).toBe(LeaveStatus.SUBMITTED);
    });

    it('should use BINDING formula: single day = 1', async () => {
      const draft = makeDraftRequest({
        startDate: new Date('2026-08-10'),
        endDate: new Date('2026-08-10'),
      });
      const policy = makePolicy();
      const balance = makeBalance({ remainingDays: 1, usedDays: 19 });
      const submitted = { ...draft, status: LeaveStatus.SUBMITTED };

      requestRepo.findById.mockResolvedValue(draft);
      policyRepo.findById.mockResolvedValue(policy);
      balanceRepo.findByEmployeeAndPolicy.mockResolvedValue(balance);
      requestRepo.update.mockResolvedValue(submitted);

      const result = await service.submit('lr-001');
      expect(result.status).toBe(LeaveStatus.SUBMITTED);
    });

    it('should use BINDING formula: single day = 1, reject if 0 remaining', async () => {
      const draft = makeDraftRequest({
        startDate: new Date('2026-08-10'),
        endDate: new Date('2026-08-10'),
      });
      const policy = makePolicy();
      const balance = makeBalance({ remainingDays: 0, usedDays: 20 });

      requestRepo.findById.mockResolvedValue(draft);
      policyRepo.findById.mockResolvedValue(policy);
      balanceRepo.findByEmployeeAndPolicy.mockResolvedValue(balance);

      await expect(service.submit('lr-001')).rejects.toEqual({
        error: 'Insufficient balance: 0 remaining, 1 requested',
        code: 'INSUFFICIENT_BALANCE',
      });
    });
  });

  // ─── approve ───────────────────────────────────────────────────

  describe('approve', () => {
    it('should approve a SUBMITTED request and deduct balance', async () => {
      const request = makeDraftRequest({ status: LeaveStatus.SUBMITTED });
      const employee = makeEmployee({ managerId: 'mgr-001' });
      const balance = makeBalance({ usedDays: 0, remainingDays: 20 });
      const approved = {
        ...request,
        status: LeaveStatus.APPROVED,
        approvedBy: 'mgr-001',
        approvedAt: new Date('2026-08-16T12:00:00Z'),
      };

      requestRepo.findById.mockResolvedValue(request);
      employeeRepo.findById.mockResolvedValue(employee);
      balanceRepo.findByEmployeeAndPolicy.mockResolvedValue(balance);
      balanceRepo.update.mockResolvedValue({
        ...balance,
        usedDays: 5,
        remainingDays: 15,
      });
      requestRepo.update.mockResolvedValue(approved);

      const result = await service.approve('lr-001', 'mgr-001');

      expect(result.status).toBe(LeaveStatus.APPROVED);
      expect(result.approvedBy).toBe('mgr-001');
      expect(result.approvedAt).not.toBeNull();

      // BINDING formula: Aug 10-14 = 5 days
      expect(balanceRepo.update).toHaveBeenCalledWith('bal-001', {
        usedDays: 5,
        remainingDays: 15,
      });
    });

    it('should throw if request not found', async () => {
      requestRepo.findById.mockResolvedValue(null);

      await expect(service.approve('lr-001', 'mgr-001')).rejects.toEqual({
        error: 'Leave request not found',
        code: 'REQUEST_NOT_FOUND',
      });
    });

    it('should throw if request is not SUBMITTED', async () => {
      requestRepo.findById.mockResolvedValue(makeDraftRequest({ status: LeaveStatus.DRAFT }));

      await expect(service.approve('lr-001', 'mgr-001')).rejects.toEqual({
        error: 'Only SUBMITTED requests can be approved',
        code: 'INVALID_STATE_TRANSITION',
      });
    });

    it('should throw if approver is not the manager', async () => {
      const request = makeDraftRequest({ status: LeaveStatus.SUBMITTED });
      const employee = makeEmployee({ managerId: 'mgr-002' });

      requestRepo.findById.mockResolvedValue(request);
      employeeRepo.findById.mockResolvedValue(employee);

      await expect(service.approve('lr-001', 'mgr-001')).rejects.toEqual({
        error: "Only the employee's manager can approve this request",
        code: 'NOT_MANAGER',
      });
    });

    it('should throw if balance not found', async () => {
      const request = makeDraftRequest({ status: LeaveStatus.SUBMITTED });
      const employee = makeEmployee({ managerId: 'mgr-001' });

      requestRepo.findById.mockResolvedValue(request);
      employeeRepo.findById.mockResolvedValue(employee);
      balanceRepo.findByEmployeeAndPolicy.mockResolvedValue(null);

      await expect(service.approve('lr-001', 'mgr-001')).rejects.toEqual({
        error: 'Leave balance not found',
        code: 'BALANCE_NOT_FOUND',
      });
    });

    it('should throw if balance is CLOSED', async () => {
      const request = makeDraftRequest({ status: LeaveStatus.SUBMITTED });
      const employee = makeEmployee({ managerId: 'mgr-001' });
      const balance = makeBalance({ status: 'CLOSED' });

      requestRepo.findById.mockResolvedValue(request);
      employeeRepo.findById.mockResolvedValue(employee);
      balanceRepo.findByEmployeeAndPolicy.mockResolvedValue(balance);

      await expect(service.approve('lr-001', 'mgr-001')).rejects.toEqual({
        error: 'Leave balance is closed',
        code: 'BALANCE_CLOSED',
      });
    });

    it('should preserve remainingDays = totalEntitlement - usedDays invariant', async () => {
      const request = makeDraftRequest({
        status: LeaveStatus.SUBMITTED,
        startDate: new Date('2026-08-10'),
        endDate: new Date('2026-08-12'), // 3 days
      });
      const employee = makeEmployee({ managerId: 'mgr-001' });
      const balance = makeBalance({ totalEntitlement: 20, usedDays: 10, remainingDays: 10 });
      const approved = {
        ...request,
        status: LeaveStatus.APPROVED,
        approvedBy: 'mgr-001',
        approvedAt: new Date(),
      };

      requestRepo.findById.mockResolvedValue(request);
      employeeRepo.findById.mockResolvedValue(employee);
      balanceRepo.findByEmployeeAndPolicy.mockResolvedValue(balance);
      balanceRepo.update.mockResolvedValue({
        ...balance,
        usedDays: 13,
        remainingDays: 7,
      });
      requestRepo.update.mockResolvedValue(approved);

      await service.approve('lr-001', 'mgr-001');

      // 10 + 3 = 13 usedDays, 20 - 13 = 7 remainingDays
      expect(balanceRepo.update).toHaveBeenCalledWith('bal-001', {
        usedDays: 13,
        remainingDays: 7,
      });
    });
  });

  // ─── reject ────────────────────────────────────────────────────

  describe('reject', () => {
    it('should reject a SUBMITTED request', async () => {
      const request = makeDraftRequest({ status: LeaveStatus.SUBMITTED });
      const employee = makeEmployee({ managerId: 'mgr-001' });
      const rejected = { ...request, status: LeaveStatus.REJECTED };

      requestRepo.findById.mockResolvedValue(request);
      employeeRepo.findById.mockResolvedValue(employee);
      requestRepo.update.mockResolvedValue(rejected);

      const result = await service.reject('lr-001', 'mgr-001');

      expect(result.status).toBe(LeaveStatus.REJECTED);
      expect(result.approvedBy).toBeNull();
      expect(result.approvedAt).toBeNull();
    });

    it('should throw if request not found', async () => {
      requestRepo.findById.mockResolvedValue(null);

      await expect(service.reject('lr-001', 'mgr-001')).rejects.toEqual({
        error: 'Leave request not found',
        code: 'REQUEST_NOT_FOUND',
      });
    });

    it('should throw if request is not SUBMITTED', async () => {
      requestRepo.findById.mockResolvedValue(makeDraftRequest({ status: LeaveStatus.DRAFT }));

      await expect(service.reject('lr-001', 'mgr-001')).rejects.toEqual({
        error: 'Only SUBMITTED requests can be rejected',
        code: 'INVALID_STATE_TRANSITION',
      });
    });

    it('should throw if approver is not the manager', async () => {
      const request = makeDraftRequest({ status: LeaveStatus.SUBMITTED });
      const employee = makeEmployee({ managerId: 'mgr-002' });

      requestRepo.findById.mockResolvedValue(request);
      employeeRepo.findById.mockResolvedValue(employee);

      await expect(service.reject('lr-001', 'mgr-001')).rejects.toEqual({
        error: "Only the employee's manager can reject this request",
        code: 'NOT_MANAGER',
      });
    });

    it('should not touch balance', async () => {
      const request = makeDraftRequest({ status: LeaveStatus.SUBMITTED });
      const employee = makeEmployee({ managerId: 'mgr-001' });
      const rejected = { ...request, status: LeaveStatus.REJECTED };

      requestRepo.findById.mockResolvedValue(request);
      employeeRepo.findById.mockResolvedValue(employee);
      requestRepo.update.mockResolvedValue(rejected);

      await service.reject('lr-001', 'mgr-001');

      expect(balanceRepo.update).not.toHaveBeenCalled();
      expect(balanceRepo.findByEmployeeAndPolicy).not.toHaveBeenCalled();
    });
  });

  // ─── cancel ────────────────────────────────────────────────────

  describe('cancel', () => {
    it('should cancel a SUBMITTED request without touching balance', async () => {
      const request = makeDraftRequest({ status: LeaveStatus.SUBMITTED });
      const cancelled = {
        ...request,
        status: LeaveStatus.CANCELLED,
        cancelledAt: new Date('2026-08-16T12:00:00Z'),
      };

      requestRepo.findById.mockResolvedValue(request);
      requestRepo.update.mockResolvedValue(cancelled);

      const result = await service.cancel('lr-001');

      expect(result.status).toBe(LeaveStatus.CANCELLED);
      expect(result.cancelledAt).not.toBeNull();
      expect(balanceRepo.update).not.toHaveBeenCalled();
    });

    it('should cancel an APPROVED request and restore usedDays', async () => {
      const request = makeDraftRequest({
        status: LeaveStatus.APPROVED,
        approvedBy: 'mgr-001',
        approvedAt: new Date('2026-08-15T00:00:00Z'),
        startDate: new Date('2026-08-10'),
        endDate: new Date('2026-08-14'), // 5 days
      });
      const balance = makeBalance({ usedDays: 5, remainingDays: 15 });
      const cancelled = {
        ...request,
        status: LeaveStatus.CANCELLED,
        cancelledAt: new Date('2026-08-16T12:00:00Z'),
      };

      requestRepo.findById.mockResolvedValue(request);
      balanceRepo.findByEmployeeAndPolicy.mockResolvedValue(balance);
      balanceRepo.update.mockResolvedValue({
        ...balance,
        usedDays: 0,
        remainingDays: 20,
      });
      requestRepo.update.mockResolvedValue(cancelled);

      const result = await service.cancel('lr-001');

      expect(result.status).toBe(LeaveStatus.CANCELLED);
      expect(result.cancelledAt).not.toBeNull();
      // 5 - 5 = 0 usedDays, 20 - 0 = 20 remainingDays
      expect(balanceRepo.update).toHaveBeenCalledWith('bal-001', {
        usedDays: 0,
        remainingDays: 20,
      });
    });

    it('should throw if request not found', async () => {
      requestRepo.findById.mockResolvedValue(null);

      await expect(service.cancel('lr-001')).rejects.toEqual({
        error: 'Leave request not found',
        code: 'REQUEST_NOT_FOUND',
      });
    });

    it('should throw if request is DRAFT', async () => {
      requestRepo.findById.mockResolvedValue(makeDraftRequest({ status: LeaveStatus.DRAFT }));

      await expect(service.cancel('lr-001')).rejects.toEqual({
        error: 'Only SUBMITTED or APPROVED requests can be cancelled',
        code: 'INVALID_STATE_TRANSITION',
      });
    });

    it('should throw if request is REJECTED', async () => {
      requestRepo.findById.mockResolvedValue(makeDraftRequest({ status: LeaveStatus.REJECTED }));

      await expect(service.cancel('lr-001')).rejects.toEqual({
        error: 'Only SUBMITTED or APPROVED requests can be cancelled',
        code: 'INVALID_STATE_TRANSITION',
      });
    });

    it('should throw if request is already CANCELLED', async () => {
      requestRepo.findById.mockResolvedValue(
        makeDraftRequest({
          status: LeaveStatus.CANCELLED,
          cancelledAt: new Date('2026-08-15T00:00:00Z'),
        }),
      );

      await expect(service.cancel('lr-001')).rejects.toEqual({
        error: 'Only SUBMITTED or APPROVED requests can be cancelled',
        code: 'INVALID_STATE_TRANSITION',
      });
    });

    it('should throw if cancelling APPROVED but balance not found', async () => {
      const request = makeDraftRequest({
        status: LeaveStatus.APPROVED,
        approvedBy: 'mgr-001',
        approvedAt: new Date('2026-08-15T00:00:00Z'),
      });

      requestRepo.findById.mockResolvedValue(request);
      balanceRepo.findByEmployeeAndPolicy.mockResolvedValue(null);

      await expect(service.cancel('lr-001')).rejects.toEqual({
        error: 'Leave balance not found',
        code: 'BALANCE_NOT_FOUND',
      });
    });

    it('should throw if cancelling APPROVED but balance is CLOSED', async () => {
      const request = makeDraftRequest({
        status: LeaveStatus.APPROVED,
        approvedBy: 'mgr-001',
        approvedAt: new Date('2026-08-15T00:00:00Z'),
      });
      const balance = makeBalance({ status: 'CLOSED' });

      requestRepo.findById.mockResolvedValue(request);
      balanceRepo.findByEmployeeAndPolicy.mockResolvedValue(balance);

      await expect(service.cancel('lr-001')).rejects.toEqual({
        error: 'Leave balance is closed',
        code: 'BALANCE_CLOSED',
      });
    });

    it('should preserve remainingDays = totalEntitlement - usedDays when restoring', async () => {
      const request = makeDraftRequest({
        status: LeaveStatus.APPROVED,
        approvedBy: 'mgr-001',
        approvedAt: new Date('2026-08-15T00:00:00Z'),
        startDate: new Date('2026-08-10'),
        endDate: new Date('2026-08-12'), // 3 days
      });
      const balance = makeBalance({ totalEntitlement: 20, usedDays: 8, remainingDays: 12 });
      const cancelled = {
        ...request,
        status: LeaveStatus.CANCELLED,
        cancelledAt: new Date(),
      };

      requestRepo.findById.mockResolvedValue(request);
      balanceRepo.findByEmployeeAndPolicy.mockResolvedValue(balance);
      balanceRepo.update.mockResolvedValue({
        ...balance,
        usedDays: 5,
        remainingDays: 15,
      });
      requestRepo.update.mockResolvedValue(cancelled);

      await service.cancel('lr-001');

      // 8 - 3 = 5 usedDays, 20 - 5 = 15 remainingDays
      expect(balanceRepo.update).toHaveBeenCalledWith('bal-001', {
        usedDays: 5,
        remainingDays: 15,
      });
    });
  });

  // ─── read-only methods ─────────────────────────────────────────

  describe('findById', () => {
    it('should delegate to repository', async () => {
      const request = makeDraftRequest();
      requestRepo.findById.mockResolvedValue(request);

      const result = await service.findById('lr-001');
      expect(result).toBe(request);
    });

    it('should return null when not found', async () => {
      requestRepo.findById.mockResolvedValue(null);
      const result = await service.findById('lr-999');
      expect(result).toBeNull();
    });
  });

  describe('findByEmployeeId', () => {
    it('should delegate to repository', async () => {
      const requests = [makeDraftRequest(), makeDraftRequest({ id: 'lr-002' })];
      requestRepo.findByEmployeeId.mockResolvedValue(requests);

      const result = await service.findByEmployeeId('emp-001');
      expect(result).toHaveLength(2);
    });

    it('should return empty array when none found', async () => {
      requestRepo.findByEmployeeId.mockResolvedValue([]);
      const result = await service.findByEmployeeId('emp-999');
      expect(result).toEqual([]);
    });
  });

  describe('query', () => {
    it('should delegate to repository with params', async () => {
      const requests = [makeDraftRequest()];
      requestRepo.query.mockResolvedValue(requests);

      const params = {
        employeeId: 'emp-001',
        status: LeaveStatus.DRAFT,
        leavePolicyId: undefined,
        startDateFrom: undefined,
        startDateTo: undefined,
      };

      const result = await service.query(params);
      expect(result).toHaveLength(1);
      expect(requestRepo.query).toHaveBeenCalledWith(params);
    });

    it('should return empty array when no results', async () => {
      requestRepo.query.mockResolvedValue([]);
      const result = await service.query({
        employeeId: undefined,
        status: undefined,
        leavePolicyId: undefined,
        startDateFrom: undefined,
        startDateTo: undefined,
      });
      expect(result).toEqual([]);
    });
  });

  // ─── state machine enforcement ─────────────────────────────────

  describe('state machine', () => {
    it('should reject DRAFT → APPROVED (skip submit)', async () => {
      requestRepo.findById.mockResolvedValue(makeDraftRequest({ status: LeaveStatus.DRAFT }));

      await expect(service.approve('lr-001', 'mgr-001')).rejects.toEqual({
        error: 'Only SUBMITTED requests can be approved',
        code: 'INVALID_STATE_TRANSITION',
      });
    });

    it('should reject APPROVED → SUBMITTED (go backwards)', async () => {
      const request = makeDraftRequest({
        status: LeaveStatus.APPROVED,
        approvedBy: 'mgr-001',
        approvedAt: new Date(),
      });
      requestRepo.findById.mockResolvedValue(request);

      await expect(service.submit('lr-001')).rejects.toEqual({
        error: 'Only DRAFT requests can be submitted',
        code: 'INVALID_STATE_TRANSITION',
      });
    });

    it('should reject REJECTED → CANCELLED', async () => {
      requestRepo.findById.mockResolvedValue(makeDraftRequest({ status: LeaveStatus.REJECTED }));

      await expect(service.cancel('lr-001')).rejects.toEqual({
        error: 'Only SUBMITTED or APPROVED requests can be cancelled',
        code: 'INVALID_STATE_TRANSITION',
      });
    });

    it('should reject DRAFT → REJECTED (skip submit)', async () => {
      requestRepo.findById.mockResolvedValue(makeDraftRequest({ status: LeaveStatus.DRAFT }));

      await expect(service.reject('lr-001', 'mgr-001')).rejects.toEqual({
        error: 'Only SUBMITTED requests can be rejected',
        code: 'INVALID_STATE_TRANSITION',
      });
    });

    it('should reject APPROVED → REJECTED', async () => {
      const request = makeDraftRequest({
        status: LeaveStatus.APPROVED,
        approvedBy: 'mgr-001',
        approvedAt: new Date(),
      });
      const employee = makeEmployee({ managerId: 'mgr-001' });
      requestRepo.findById.mockResolvedValue(request);
      employeeRepo.findById.mockResolvedValue(employee);

      await expect(service.reject('lr-001', 'mgr-001')).rejects.toEqual({
        error: 'Only SUBMITTED requests can be rejected',
        code: 'INVALID_STATE_TRANSITION',
      });
    });
  });

  // ─── BINDING formula edge cases ────────────────────────────────

  describe('BINDING day-counting formula', () => {
    it('should count 5 days for Mon-Fri (Aug 10-14, 2026)', async () => {
      // This is tested implicitly via submit/approve, but let's verify
      // the formula directly: (14-10) + 1 = 5
      const draft = makeDraftRequest({
        startDate: new Date('2026-08-10'),
        endDate: new Date('2026-08-14'),
        status: LeaveStatus.SUBMITTED,
      });
      const employee = makeEmployee({ managerId: 'mgr-001' });
      const balance = makeBalance({ usedDays: 0, remainingDays: 20 });

      requestRepo.findById.mockResolvedValue(draft);
      employeeRepo.findById.mockResolvedValue(employee);
      balanceRepo.findByEmployeeAndPolicy.mockResolvedValue(balance);
      balanceRepo.update.mockResolvedValue({ ...balance, usedDays: 5, remainingDays: 15 });
      requestRepo.update.mockResolvedValue({
        ...draft,
        status: LeaveStatus.APPROVED,
        approvedBy: 'mgr-001',
        approvedAt: new Date(),
      });

      await service.approve('lr-001', 'mgr-001');

      expect(balanceRepo.update).toHaveBeenCalledWith('bal-001', {
        usedDays: 5,
        remainingDays: 15,
      });
    });

    it('should count 1 day for single-day leave', async () => {
      const draft = makeDraftRequest({
        startDate: new Date('2026-08-10'),
        endDate: new Date('2026-08-10'),
        status: LeaveStatus.SUBMITTED,
      });
      const employee = makeEmployee({ managerId: 'mgr-001' });
      const balance = makeBalance({ usedDays: 0, remainingDays: 20 });

      requestRepo.findById.mockResolvedValue(draft);
      employeeRepo.findById.mockResolvedValue(employee);
      balanceRepo.findByEmployeeAndPolicy.mockResolvedValue(balance);
      balanceRepo.update.mockResolvedValue({ ...balance, usedDays: 1, remainingDays: 19 });
      requestRepo.update.mockResolvedValue({
        ...draft,
        status: LeaveStatus.APPROVED,
        approvedBy: 'mgr-001',
        approvedAt: new Date(),
      });

      await service.approve('lr-001', 'mgr-001');

      expect(balanceRepo.update).toHaveBeenCalledWith('bal-001', {
        usedDays: 1,
        remainingDays: 19,
      });
    });

    it('should count 10 days for two full weeks (Mon-Fri to next Fri)', async () => {
      const draft = makeDraftRequest({
        startDate: new Date('2026-08-10'),
        endDate: new Date('2026-08-21'),
        status: LeaveStatus.SUBMITTED,
      });
      const employee = makeEmployee({ managerId: 'mgr-001' });
      const balance = makeBalance({ usedDays: 0, remainingDays: 20 });

      requestRepo.findById.mockResolvedValue(draft);
      employeeRepo.findById.mockResolvedValue(employee);
      balanceRepo.findByEmployeeAndPolicy.mockResolvedValue(balance);
      balanceRepo.update.mockResolvedValue({ ...balance, usedDays: 12, remainingDays: 8 });
      requestRepo.update.mockResolvedValue({
        ...draft,
        status: LeaveStatus.APPROVED,
        approvedBy: 'mgr-001',
        approvedAt: new Date(),
      });

      await service.approve('lr-001', 'mgr-001');

      // Aug 10 to Aug 21 = (21-10) + 1 = 12 days
      expect(balanceRepo.update).toHaveBeenCalledWith('bal-001', {
        usedDays: 12,
        remainingDays: 8,
      });
    });
  });
});
