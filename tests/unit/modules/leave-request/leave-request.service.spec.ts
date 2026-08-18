
import { LeaveRequestService, ILeaveRequestService } from 'modules/leave-request';
import { ILeaveRequestRepository } from 'modules/leave-request';
import { LeaveRequest, CreateLeaveRequestDto } from 'modules/leave-request';
import { IEmployeeService, Employee } from 'modules/employee';
import { ILeavePolicyService, LeavePolicy } from 'modules/leave-policy';
import { ILeaveBalanceService, LeaveBalance } from 'modules/balance';
import { LeaveStatus, LeaveType, EmploymentStatus } from 'shared/types';
import { NotFoundError, ValidationError, ConflictError } from 'shared/error-types';

function createMockLeaveRequest(overrides: Partial<LeaveRequest> = {}): LeaveRequest {
  return {
    id: 'lr-1',
    employeeId: 'emp-1',
    leavePolicyId: 'lp-1',
    startDate: new Date('2026-06-01'),
    endDate: new Date('2026-06-05'),
    reason: 'Vacation',
    status: LeaveStatus.DRAFT,
    approvedBy: null,
    approvedAt: null,
    cancelledBy: null,
    cancelledAt: null,
    createdAt: new Date('2026-05-20T10:00:00Z'),
    updatedAt: new Date('2026-05-20T10:00:00Z'),
    ...overrides,
  };
}

function createMockEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
    id: 'emp-1',
    employeeNumber: 'EMP001',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    managerId: 'mgr-1',
    department: 'Engineering',
    hireDate: new Date('2020-01-15'),
    terminationDate: null,
    employmentStatus: EmploymentStatus.ACTIVE,
    createdAt: new Date('2020-01-15T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
    deletedAt: null,
    ...overrides,
  };
}

function createMockLeavePolicy(overrides: Partial<LeavePolicy> = {}): LeavePolicy {
  return {
    id: 'lp-1',
    policyName: 'Annual Leave',
    leaveType: LeaveType.ANNUAL,
    entitlementDays: 20,
    accrualRate: null,
    maxAccumulation: 40,
    minimumNoticeDays: 7,
    requiresManagerApproval: true,
    isActive: true,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
    ...overrides,
  };
}

function createMockLeaveBalance(overrides: Partial<LeaveBalance> = {}): LeaveBalance {
  return {
    id: 'bal-1',
    employeeId: 'emp-1',
    leavePolicyId: 'lp-1',
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

describe('LeaveRequestService', () => {
  let service: ILeaveRequestService;
  let mockRepo: jest.Mocked<ILeaveRequestRepository>;
  let mockEmployeeService: jest.Mocked<IEmployeeService>;
  let mockLeavePolicyService: jest.Mocked<ILeavePolicyService>;
  let mockLeaveBalanceService: jest.Mocked<ILeaveBalanceService>;

  beforeEach(() => {
    mockRepo = {
      findById: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findByEmployeeId: jest.fn(),
      findByStatus: jest.fn(),
      findOverlapping: jest.fn(),
      findByDateRange: jest.fn(),
      findPendingForManager: jest.fn(),
    };

    mockEmployeeService = {
      getById: jest.fn(),
      getByEmployeeNumber: jest.fn(),
      getByEmail: jest.fn(),
      getSubordinates: jest.fn(),
      isActive: jest.fn(),
    };

    mockLeavePolicyService = {
      getById: jest.fn(),
      getByLeaveType: jest.fn(),
      getActivePolicies: jest.fn(),
      isLeaveTypeActive: jest.fn(),
    };

    mockLeaveBalanceService = {
      getBalance: jest.fn(),
      getOrCreateBalance: jest.fn(),
      deductDays: jest.fn(),
      restoreDays: jest.fn(),
      getRemainingDays: jest.fn(),
      closeBalance: jest.fn(),
    };

    service = new LeaveRequestService(
      mockRepo,
      mockEmployeeService,
      mockLeavePolicyService,
      mockLeaveBalanceService,
    );
  });

  // ── create ──────────────────────────────────────────────

  describe('create', () => {
    const validDto: CreateLeaveRequestDto = {
      employeeId: 'emp-1',
      leavePolicyId: 'lp-1',
      startDate: new Date('2026-06-01'),
      endDate: new Date('2026-06-05'),
      reason: 'Vacation',
    };

    it('should create a LeaveRequest with status DRAFT', async () => {
      const employee = createMockEmployee();
      const policy = createMockLeavePolicy();
      const saved = createMockLeaveRequest();

      mockEmployeeService.getById.mockResolvedValue(employee);
      mockLeavePolicyService.getById.mockResolvedValue(policy);
      mockRepo.create.mockResolvedValue(saved);

      const result = await service.create(validDto);

      expect(result.status).toBe(LeaveStatus.DRAFT);
      expect(result.employeeId).toBe('emp-1');
      expect(result.leavePolicyId).toBe('lp-1');
      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          employeeId: 'emp-1',
          leavePolicyId: 'lp-1',
          startDate: validDto.startDate,
          endDate: validDto.endDate,
          reason: 'Vacation',
          status: LeaveStatus.DRAFT,
        }),
      );
    });

    it('should throw ValidationError when endDate is before startDate', async () => {
      const dto: CreateLeaveRequestDto = {
        ...validDto,
        startDate: new Date('2026-06-10'),
        endDate: new Date('2026-06-05'),
      };

      await expect(service.create(dto)).rejects.toThrow(ValidationError);
      await expect(service.create(dto)).rejects.toThrow(
        'endDate must be on or after startDate',
      );
    });

    it('should throw ValidationError when employee is not ACTIVE', async () => {
      const employee = createMockEmployee({ employmentStatus: EmploymentStatus.INACTIVE });
      mockEmployeeService.getById.mockResolvedValue(employee);

      await expect(service.create(validDto)).rejects.toThrow(ValidationError);
      await expect(service.create(validDto)).rejects.toThrow('Employee is not active');
    });

    it('should throw ValidationError when policy is not active', async () => {
      const employee = createMockEmployee();
      const policy = createMockLeavePolicy({ isActive: false });
      mockEmployeeService.getById.mockResolvedValue(employee);
      mockLeavePolicyService.getById.mockResolvedValue(policy);

      await expect(service.create(validDto)).rejects.toThrow(ValidationError);
      await expect(service.create(validDto)).rejects.toThrow('Leave policy is not active');
    });
  });

  // ── submit ─────────────────────────────────────────────

  describe('submit', () => {
    it('should transition status from DRAFT to SUBMITTED when valid', async () => {
      const farFuture = new Date();
      farFuture.setDate(farFuture.getDate() + 30);
      const draft = createMockLeaveRequest({
        status: LeaveStatus.DRAFT,
        startDate: farFuture,
        endDate: new Date(farFuture.getTime() + 4 * 24 * 60 * 60 * 1000),
      });
      const employee = createMockEmployee();
      const policy = createMockLeavePolicy();
      const submitted = createMockLeaveRequest({
        status: LeaveStatus.SUBMITTED,
        startDate: farFuture,
        endDate: new Date(farFuture.getTime() + 4 * 24 * 60 * 60 * 1000),
      });

      mockRepo.findById.mockResolvedValue(draft);
      mockEmployeeService.getById.mockResolvedValue(employee);
      mockLeavePolicyService.getById.mockResolvedValue(policy);
      mockRepo.findOverlapping.mockResolvedValue([]);
      mockLeaveBalanceService.getRemainingDays.mockResolvedValue(20);
      mockRepo.update.mockResolvedValue(submitted);

      const result = await service.submit('lr-1');

      expect(result.status).toBe(LeaveStatus.SUBMITTED);
      expect(mockRepo.update).toHaveBeenCalledWith('lr-1', {
        status: LeaveStatus.SUBMITTED,
        updatedAt: expect.any(Date),
      });
    });

    it('should throw NotFoundError when request does not exist', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(service.submit('nonexistent')).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError when status is not DRAFT', async () => {
      const approved = createMockLeaveRequest({ status: LeaveStatus.APPROVED });
      mockRepo.findById.mockResolvedValue(approved);

      await expect(service.submit('lr-1')).rejects.toThrow(ValidationError);
      await expect(service.submit('lr-1')).rejects.toThrow(
        'Cannot submit leave request with status APPROVED',
      );
    });

    it('should throw ValidationError when employee is not active', async () => {
      const draft = createMockLeaveRequest({ status: LeaveStatus.DRAFT });
      const employee = createMockEmployee({ employmentStatus: EmploymentStatus.TERMINATED });
      mockRepo.findById.mockResolvedValue(draft);
      mockEmployeeService.getById.mockResolvedValue(employee);

      await expect(service.submit('lr-1')).rejects.toThrow(ValidationError);
      await expect(service.submit('lr-1')).rejects.toThrow('Employee is not active');
    });

    it('should throw ValidationError when policy is not active', async () => {
      const draft = createMockLeaveRequest({ status: LeaveStatus.DRAFT });
      const employee = createMockEmployee();
      const policy = createMockLeavePolicy({ isActive: false });
      mockRepo.findById.mockResolvedValue(draft);
      mockEmployeeService.getById.mockResolvedValue(employee);
      mockLeavePolicyService.getById.mockResolvedValue(policy);

      await expect(service.submit('lr-1')).rejects.toThrow(ValidationError);
      await expect(service.submit('lr-1')).rejects.toThrow('Leave policy is not active');
    });

    it('should throw ValidationError when insufficient balance', async () => {
      const farFuture = new Date();
      farFuture.setDate(farFuture.getDate() + 30);
      const draft = createMockLeaveRequest({
        status: LeaveStatus.DRAFT,
        startDate: farFuture,
        endDate: new Date(farFuture.getTime() + 9 * 24 * 60 * 60 * 1000),
      });
      const employee = createMockEmployee();
      const policy = createMockLeavePolicy();
      mockRepo.findById.mockResolvedValue(draft);
      mockEmployeeService.getById.mockResolvedValue(employee);
      mockLeavePolicyService.getById.mockResolvedValue(policy);
      mockRepo.findOverlapping.mockResolvedValue([]);
      mockLeaveBalanceService.getRemainingDays.mockResolvedValue(3);

      await expect(service.submit('lr-1')).rejects.toThrow(ValidationError);
      await expect(service.submit('lr-1')).rejects.toThrow('Insufficient leave balance');
    });

    it('should throw ConflictError when overlapping requests exist', async () => {
      const farFuture = new Date();
      farFuture.setDate(farFuture.getDate() + 30);
      const draft = createMockLeaveRequest({
        status: LeaveStatus.DRAFT,
        startDate: farFuture,
        endDate: new Date(farFuture.getTime() + 4 * 24 * 60 * 60 * 1000),
      });
      const employee = createMockEmployee();
      const policy = createMockLeavePolicy();
      const overlapping = createMockLeaveRequest({ id: 'lr-2' });
      mockRepo.findById.mockResolvedValue(draft);
      mockEmployeeService.getById.mockResolvedValue(employee);
      mockLeavePolicyService.getById.mockResolvedValue(policy);
      mockRepo.findOverlapping.mockResolvedValue([overlapping]);

      await expect(service.submit('lr-1')).rejects.toThrow(ConflictError);
      await expect(service.submit('lr-1')).rejects.toThrow(
        'Employee has overlapping leave requests',
      );
    });

    it('should allow emergency leave to bypass minimumNoticeDays', async () => {
      const draft = createMockLeaveRequest({
        status: LeaveStatus.DRAFT,
        startDate: new Date('2026-06-02'),
      });
      const employee = createMockEmployee();
      const policy = createMockLeavePolicy({
        leaveType: LeaveType.EMERGENCY,
        minimumNoticeDays: 14,
      });
      const submitted = createMockLeaveRequest({ status: LeaveStatus.SUBMITTED });

      mockRepo.findById.mockResolvedValue(draft);
      mockEmployeeService.getById.mockResolvedValue(employee);
      mockLeavePolicyService.getById.mockResolvedValue(policy);
      mockRepo.findOverlapping.mockResolvedValue([]);
      mockLeaveBalanceService.getRemainingDays.mockResolvedValue(20);
      mockRepo.update.mockResolvedValue(submitted);

      const result = await service.submit('lr-1');

      expect(result.status).toBe(LeaveStatus.SUBMITTED);
    });

    it('should throw ValidationError when non-emergency leave fails minimumNoticeDays', async () => {
      const draft = createMockLeaveRequest({
        status: LeaveStatus.DRAFT,
        startDate: new Date('2026-06-02'),
      });
      const employee = createMockEmployee();
      const policy = createMockLeavePolicy({
        leaveType: LeaveType.ANNUAL,
        minimumNoticeDays: 14,
      });
      mockRepo.findById.mockResolvedValue(draft);
      mockEmployeeService.getById.mockResolvedValue(employee);
      mockLeavePolicyService.getById.mockResolvedValue(policy);

      await expect(service.submit('lr-1')).rejects.toThrow(ValidationError);
      await expect(service.submit('lr-1')).rejects.toThrow('days notice');
    });

    it('should allow non-emergency leave when minimumNoticeDays is met', async () => {
      const farFuture = new Date();
      farFuture.setDate(farFuture.getDate() + 30);
      const draft = createMockLeaveRequest({
        status: LeaveStatus.DRAFT,
        startDate: farFuture,
        endDate: new Date(farFuture.getTime() + 4 * 24 * 60 * 60 * 1000),
      });
      const employee = createMockEmployee();
      const policy = createMockLeavePolicy({
        leaveType: LeaveType.ANNUAL,
        minimumNoticeDays: 7,
      });
      const submitted = createMockLeaveRequest({ status: LeaveStatus.SUBMITTED });

      mockRepo.findById.mockResolvedValue(draft);
      mockEmployeeService.getById.mockResolvedValue(employee);
      mockLeavePolicyService.getById.mockResolvedValue(policy);
      mockRepo.findOverlapping.mockResolvedValue([]);
      mockLeaveBalanceService.getRemainingDays.mockResolvedValue(20);
      mockRepo.update.mockResolvedValue(submitted);

      const result = await service.submit('lr-1');
      expect(result.status).toBe(LeaveStatus.SUBMITTED);
    });
  });

  // ── approve ────────────────────────────────────────────

  describe('approve', () => {
    it('should deduct balance, set approvedBy/approvedAt, and transition to APPROVED', async () => {
      const submitted = createMockLeaveRequest({ status: LeaveStatus.SUBMITTED });
      const approved = createMockLeaveRequest({
        status: LeaveStatus.APPROVED,
        approvedBy: 'approver-1',
        approvedAt: new Date('2026-05-25T12:00:00Z'),
      });

      mockRepo.findById.mockResolvedValue(submitted);
      mockLeaveBalanceService.deductDays.mockResolvedValue(createMockLeaveBalance());
      mockRepo.update.mockResolvedValue(approved);

      const result = await service.approve('lr-1', 'approver-1');

      expect(result.status).toBe(LeaveStatus.APPROVED);
      expect(result.approvedBy).toBe('approver-1');
      expect(result.approvedAt).toBeDefined();

      // Verify deductDays called with correct inclusive-day count
      // startDate=2026-06-01, endDate=2026-06-05 → (5-1)+1 = 5 days
      expect(mockLeaveBalanceService.deductDays).toHaveBeenCalledWith(
        'emp-1',
        'lp-1',
        2026,
        submitted.startDate,
        submitted.endDate,
      );
    });

    it('should throw NotFoundError when request does not exist', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(service.approve('nonexistent', 'approver-1')).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError when status is not SUBMITTED', async () => {
      const draft = createMockLeaveRequest({ status: LeaveStatus.DRAFT });
      mockRepo.findById.mockResolvedValue(draft);

      await expect(service.approve('lr-1', 'approver-1')).rejects.toThrow(ValidationError);
      await expect(service.approve('lr-1', 'approver-1')).rejects.toThrow(
        'Cannot approve leave request with status DRAFT',
      );
    });
  });

  // ── reject ─────────────────────────────────────────────

  describe('reject', () => {
    it('should NOT call any balance service method', async () => {
      const submitted = createMockLeaveRequest({ status: LeaveStatus.SUBMITTED });
      const rejected = createMockLeaveRequest({
        status: LeaveStatus.REJECTED,
        approvedBy: 'approver-1',
        approvedAt: new Date('2026-05-25T12:00:00Z'),
      });

      mockRepo.findById.mockResolvedValue(submitted);
      mockRepo.update.mockResolvedValue(rejected);

      await service.reject('lr-1', 'approver-1');

      expect(mockLeaveBalanceService.deductDays).not.toHaveBeenCalled();
      expect(mockLeaveBalanceService.restoreDays).not.toHaveBeenCalled();
      expect(mockLeaveBalanceService.getRemainingDays).not.toHaveBeenCalled();
    });

    it('should set approvedBy/approvedAt and transition to REJECTED', async () => {
      const submitted = createMockLeaveRequest({ status: LeaveStatus.SUBMITTED });
      const rejected = createMockLeaveRequest({
        status: LeaveStatus.REJECTED,
        approvedBy: 'approver-1',
        approvedAt: new Date('2026-05-25T12:00:00Z'),
      });

      mockRepo.findById.mockResolvedValue(submitted);
      mockRepo.update.mockResolvedValue(rejected);

      const result = await service.reject('lr-1', 'approver-1');

      expect(result.status).toBe(LeaveStatus.REJECTED);
      expect(result.approvedBy).toBe('approver-1');
      expect(result.approvedAt).toBeDefined();
    });

    it('should throw NotFoundError when request does not exist', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(service.reject('nonexistent', 'approver-1')).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError when status is not SUBMITTED', async () => {
      const draft = createMockLeaveRequest({ status: LeaveStatus.DRAFT });
      mockRepo.findById.mockResolvedValue(draft);

      await expect(service.reject('lr-1', 'approver-1')).rejects.toThrow(ValidationError);
      await expect(service.reject('lr-1', 'approver-1')).rejects.toThrow(
        'Cannot reject leave request with status DRAFT',
      );
    });
  });

  // ── cancel ─────────────────────────────────────────────

  describe('cancel', () => {
    it('should restore balance when cancelling from APPROVED', async () => {
      const approved = createMockLeaveRequest({ status: LeaveStatus.APPROVED });
      const cancelled = createMockLeaveRequest({
        status: LeaveStatus.CANCELLED,
        cancelledBy: 'emp-1',
        cancelledAt: new Date('2026-05-28T10:00:00Z'),
      });

      mockRepo.findById.mockResolvedValue(approved);
      mockLeaveBalanceService.restoreDays.mockResolvedValue(createMockLeaveBalance());
      mockRepo.update.mockResolvedValue(cancelled);

      const result = await service.cancel('lr-1', 'emp-1');

      expect(result.status).toBe(LeaveStatus.CANCELLED);
      expect(result.cancelledBy).toBe('emp-1');
      expect(result.cancelledAt).toBeDefined();

      // startDate=2026-06-01, endDate=2026-06-05 → 5 days
      expect(mockLeaveBalanceService.restoreDays).toHaveBeenCalledWith(
        'emp-1',
        'lp-1',
        2026,
        5,
      );
    });

    it('should NOT call any balance method when cancelling from SUBMITTED', async () => {
      const submitted = createMockLeaveRequest({ status: LeaveStatus.SUBMITTED });
      const cancelled = createMockLeaveRequest({
        status: LeaveStatus.CANCELLED,
        cancelledBy: 'emp-1',
        cancelledAt: new Date('2026-05-28T10:00:00Z'),
      });

      mockRepo.findById.mockResolvedValue(submitted);
      mockRepo.update.mockResolvedValue(cancelled);

      const result = await service.cancel('lr-1', 'emp-1');

      expect(result.status).toBe(LeaveStatus.CANCELLED);
      expect(mockLeaveBalanceService.restoreDays).not.toHaveBeenCalled();
      expect(mockLeaveBalanceService.deductDays).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError when request does not exist', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(service.cancel('nonexistent', 'emp-1')).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError when status is DRAFT', async () => {
      const draft = createMockLeaveRequest({ status: LeaveStatus.DRAFT });
      mockRepo.findById.mockResolvedValue(draft);

      await expect(service.cancel('lr-1', 'emp-1')).rejects.toThrow(ValidationError);
      await expect(service.cancel('lr-1', 'emp-1')).rejects.toThrow(
        'Cannot cancel leave request with status DRAFT',
      );
    });

    it('should throw ValidationError when status is REJECTED', async () => {
      const rejected = createMockLeaveRequest({ status: LeaveStatus.REJECTED });
      mockRepo.findById.mockResolvedValue(rejected);

      await expect(service.cancel('lr-1', 'emp-1')).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError when status is already CANCELLED', async () => {
      const alreadyCancelled = createMockLeaveRequest({ status: LeaveStatus.CANCELLED });
      mockRepo.findById.mockResolvedValue(alreadyCancelled);

      await expect(service.cancel('lr-1', 'emp-1')).rejects.toThrow(ValidationError);
    });
  });

  // ── cross-year fiscal year ─────────────────────────────

  describe('cross-year fiscal year', () => {
    it('should use startDate calendar year as fiscal year for balance operations', async () => {
      const farFuture = new Date();
      farFuture.setFullYear(farFuture.getFullYear() + 1);
      farFuture.setMonth(0); // January
      farFuture.setDate(3);
      const startDate = new Date(farFuture.getFullYear() - 1, 11, 28); // Dec 28 of previous year
      const endDate = new Date(farFuture.getFullYear(), 0, 3); // Jan 3 of farFuture year

      const draft = createMockLeaveRequest({
        status: LeaveStatus.DRAFT,
        startDate,
        endDate,
      });
      const employee = createMockEmployee();
      const policy = createMockLeavePolicy({ minimumNoticeDays: null });
      const submitted = createMockLeaveRequest({
        status: LeaveStatus.SUBMITTED,
        startDate,
        endDate,
      });

      mockRepo.findById.mockResolvedValue(draft);
      mockEmployeeService.getById.mockResolvedValue(employee);
      mockLeavePolicyService.getById.mockResolvedValue(policy);
      mockRepo.findOverlapping.mockResolvedValue([]);
      mockLeaveBalanceService.getRemainingDays.mockResolvedValue(20);
      mockRepo.update.mockResolvedValue(submitted);

      await service.submit('lr-1');

      // Fiscal year should be startDate's calendar year
      expect(mockLeaveBalanceService.getRemainingDays).toHaveBeenCalledWith(
        'emp-1',
        'lp-1',
        startDate.getFullYear(),
      );
    });

    it('should use startDate calendar year for deductDays on approve', async () => {
      const submitted = createMockLeaveRequest({
        status: LeaveStatus.SUBMITTED,
        startDate: new Date('2025-12-28'),
        endDate: new Date('2026-01-03'),
      });
      const approved = createMockLeaveRequest({
        status: LeaveStatus.APPROVED,
        startDate: new Date('2025-12-28'),
        endDate: new Date('2026-01-03'),
        approvedBy: 'approver-1',
        approvedAt: new Date(),
      });

      mockRepo.findById.mockResolvedValue(submitted);
      mockLeaveBalanceService.deductDays.mockResolvedValue(createMockLeaveBalance({ fiscalYear: 2025 }));
      mockRepo.update.mockResolvedValue(approved);

      await service.approve('lr-1', 'approver-1');

      expect(mockLeaveBalanceService.deductDays).toHaveBeenCalledWith(
        'emp-1',
        'lp-1',
        2025,
        submitted.startDate,
        submitted.endDate,
      );
    });

    it('should use startDate calendar year for restoreDays on cancel from APPROVED', async () => {
      const approved = createMockLeaveRequest({
        status: LeaveStatus.APPROVED,
        startDate: new Date('2025-12-28'),
        endDate: new Date('2026-01-03'),
      });
      const cancelled = createMockLeaveRequest({
        status: LeaveStatus.CANCELLED,
        startDate: new Date('2025-12-28'),
        endDate: new Date('2026-01-03'),
        cancelledBy: 'emp-1',
        cancelledAt: new Date(),
      });

      mockRepo.findById.mockResolvedValue(approved);
      mockLeaveBalanceService.restoreDays.mockResolvedValue(createMockLeaveBalance({ fiscalYear: 2025 }));
      mockRepo.update.mockResolvedValue(cancelled);

      await service.cancel('lr-1', 'emp-1');

      // days = (2026-01-03 - 2025-12-28) + 1 = 7 days
      expect(mockLeaveBalanceService.restoreDays).toHaveBeenCalledWith(
        'emp-1',
        'lp-1',
        2025,
        7,
      );
    });
  });

  // ── getById ────────────────────────────────────────────

  describe('getById', () => {
    it('should return the request when found', async () => {
      const lr = createMockLeaveRequest();
      mockRepo.findById.mockResolvedValue(lr);

      const result = await service.getById('lr-1');

      expect(result).toEqual(lr);
      expect(mockRepo.findById).toHaveBeenCalledWith('lr-1');
    });

    it('should throw NotFoundError when request not found', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(service.getById('nonexistent')).rejects.toThrow(NotFoundError);
      await expect(service.getById('nonexistent')).rejects.toThrow(
        'LeaveRequest with id nonexistent not found',
      );
    });
  });

  // ── query ──────────────────────────────────────────────

  describe('query', () => {
    it('should filter by employeeId', async () => {
      const requests = [createMockLeaveRequest()];
      mockRepo.findByEmployeeId.mockResolvedValue(requests);

      const result = await service.query({ employeeId: 'emp-1' });

      expect(result).toEqual(requests);
      expect(mockRepo.findByEmployeeId).toHaveBeenCalledWith('emp-1');
    });

    it('should filter by status', async () => {
      const requests = [createMockLeaveRequest({ status: LeaveStatus.SUBMITTED })];
      mockRepo.findByStatus.mockResolvedValue(requests);

      const result = await service.query({ status: LeaveStatus.SUBMITTED });

      expect(result).toEqual(requests);
      expect(mockRepo.findByStatus).toHaveBeenCalledWith(LeaveStatus.SUBMITTED);
    });

    it('should filter by date range', async () => {
      const requests = [createMockLeaveRequest()];
      const startDate = new Date('2026-06-01');
      const endDate = new Date('2026-06-30');
      mockRepo.findByDateRange.mockResolvedValue(requests);

      const result = await service.query({ startDate, endDate });

      expect(result).toEqual(requests);
      expect(mockRepo.findByDateRange).toHaveBeenCalledWith(startDate, endDate);
    });

    it('should return all requests when no filters provided', async () => {
      const requests = [createMockLeaveRequest(), createMockLeaveRequest({ id: 'lr-2' })];
      mockRepo.findAll.mockResolvedValue(requests);

      const result = await service.query({});

      expect(result).toEqual(requests);
      expect(mockRepo.findAll).toHaveBeenCalled();
    });
  });

  // ── getEmployeeRequests ────────────────────────────────

  describe('getEmployeeRequests', () => {
    it('should delegate to repository.findByEmployeeId', async () => {
      const requests = [createMockLeaveRequest(), createMockLeaveRequest({ id: 'lr-2' })];
      mockRepo.findByEmployeeId.mockResolvedValue(requests);

      const result = await service.getEmployeeRequests('emp-1');

      expect(result).toEqual(requests);
      expect(mockRepo.findByEmployeeId).toHaveBeenCalledWith('emp-1');
    });

    it('should return empty array when employee has no requests', async () => {
      mockRepo.findByEmployeeId.mockResolvedValue([]);

      const result = await service.getEmployeeRequests('emp-1');

      expect(result).toEqual([]);
    });
  });

  // ── update ─────────────────────────────────────────────

  describe('update', () => {
    it('should update a DRAFT request', async () => {
      const draft = createMockLeaveRequest({ status: LeaveStatus.DRAFT });
      const updated = createMockLeaveRequest({
        status: LeaveStatus.DRAFT,
        reason: 'Updated reason',
        updatedAt: new Date(),
      });

      mockRepo.findById.mockResolvedValue(draft);
      mockRepo.update.mockResolvedValue(updated);

      const result = await service.update('lr-1', { reason: 'Updated reason' });

      expect(result.reason).toBe('Updated reason');
      expect(mockRepo.update).toHaveBeenCalledWith(
        'lr-1',
        expect.objectContaining({ reason: 'Updated reason' }),
      );
    });

    it('should throw ValidationError when status is not DRAFT', async () => {
      const submitted = createMockLeaveRequest({ status: LeaveStatus.SUBMITTED });
      mockRepo.findById.mockResolvedValue(submitted);

      await expect(
        service.update('lr-1', { reason: 'New reason' }),
      ).rejects.toThrow(ValidationError);
    });

    it('should throw NotFoundError when request does not exist', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(
        service.update('nonexistent', { reason: 'New reason' }),
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError when updated endDate is before startDate', async () => {
      const draft = createMockLeaveRequest({
        status: LeaveStatus.DRAFT,
        startDate: new Date('2026-06-10'),
        endDate: new Date('2026-06-15'),
      });
      mockRepo.findById.mockResolvedValue(draft);

      await expect(
        service.update('lr-1', {
          startDate: new Date('2026-06-10'),
          endDate: new Date('2026-06-05'),
        }),
      ).rejects.toThrow(ValidationError);
    });
  });
});
