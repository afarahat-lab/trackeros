import {
  LeaveRequestService,
  InsufficientBalanceError,
  ApproverNotAuthorizedError,
  ValidationError,
  LeaveRequestNotFoundError,
} from '../../../../src/modules/leave-request/leave-request.service';
import { ILeaveRequestRepository } from '../../../../src/modules/leave-request/leave-request.repository';
import { ILeaveBalanceRepository } from '../../../../src/modules/leave-balance/leave-balance.repository';
import { IEmployeeRepository } from '../../../../src/modules/employee/employee.repository';
import { ILeavePolicyRepository } from '../../../../src/modules/leave-policy/leave-policy.repository';
import { LeaveRequest, CreateLeaveRequestDto } from '../../../../src/modules/leave-request/leave-request.model';
import { LeaveBalance } from '../../../../src/modules/leave-balance/leave-balance.model';
import { Employee } from '../../../../src/modules/employee/employee.model';
import { LeavePolicy } from '../../../../src/modules/leave-policy/leave-policy.model';
import { LeaveRequestStatus } from '../../../../src/shared/types';

function makeDate(iso: string): Date {
  return new Date(iso);
}

function makeLeaveRequest(overrides: Partial<LeaveRequest> = {}): LeaveRequest {
  return {
    id: 'lr-001',
    employeeId: 'emp-001',
    leavePolicyId: 'lp-001',
    startDate: makeDate('2026-08-10T00:00:00.000Z'),
    endDate: makeDate('2026-08-14T00:00:00.000Z'),
    reason: 'Vacation',
    status: LeaveRequestStatus.SUBMITTED,
    approvedBy: null,
    approvedAt: null,
    createdAt: makeDate('2026-08-01T00:00:00.000Z'),
    updatedAt: makeDate('2026-08-01T00:00:00.000Z'),
    ...overrides,
  };
}

function makeEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
    id: 'emp-001',
    employeeNumber: 'E001',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    managerId: 'mgr-001',
    department: 'Engineering',
    hireDate: makeDate('2020-01-15T00:00:00.000Z'),
    terminationDate: null,
    employmentStatus: 'ACTIVE',
    createdAt: makeDate('2020-01-15T00:00:00.000Z'),
    updatedAt: makeDate('2020-01-15T00:00:00.000Z'),
    ...overrides,
  };
}

function makeLeavePolicy(overrides: Partial<LeavePolicy> = {}): LeavePolicy {
  return {
    id: 'lp-001',
    policyName: 'Annual Leave',
    leaveTypeId: 'lt-001',
    entitlementDays: 20,
    accrualRate: undefined,
    maxAccumulation: undefined,
    minimumNoticeDays: 3,
    requiresManagerApproval: true,
    isActive: true,
    createdAt: makeDate('2020-01-01T00:00:00.000Z'),
    updatedAt: makeDate('2020-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

function makeLeaveBalance(overrides: Partial<LeaveBalance> = {}): LeaveBalance {
  return {
    id: 'lb-001',
    employeeId: 'emp-001',
    leavePolicyId: 'lp-001',
    totalEntitlement: 20,
    usedDays: 5,
    remainingDays: 15,
    fiscalYear: 2026,
    status: 'ACTIVE',
    createdAt: makeDate('2026-01-01T00:00:00.000Z'),
    updatedAt: makeDate('2026-06-01T00:00:00.000Z'),
    ...overrides,
  };
}

describe('LeaveRequestService', () => {
  let service: LeaveRequestService;
  let mockLeaveRequestRepo: jest.Mocked<ILeaveRequestRepository>;
  let mockLeaveBalanceRepo: jest.Mocked<ILeaveBalanceRepository>;
  let mockEmployeeRepo: jest.Mocked<IEmployeeRepository>;
  let mockLeavePolicyRepo: jest.Mocked<ILeavePolicyRepository>;

  beforeEach(() => {
    mockLeaveRequestRepo = {
      findById: jest.fn(),
      findByEmployee: jest.fn(),
      findByStatus: jest.fn(),
      create: jest.fn(),
      updateStatus: jest.fn(),
    };

    mockLeaveBalanceRepo = {
      findByEmployeeAndPolicy: jest.fn(),
      findByEmployee: jest.fn(),
      create: jest.fn(),
      updateUsedDays: jest.fn(),
    };

    mockEmployeeRepo = {
      findById: jest.fn(),
      findByEmployeeNumber: jest.fn(),
      findAll: jest.fn(),
    };

    mockLeavePolicyRepo = {
      findById: jest.fn(),
      findByLeaveTypeId: jest.fn(),
      findAllActive: jest.fn(),
    };

    service = new LeaveRequestService(
      mockLeaveRequestRepo,
      mockLeaveBalanceRepo,
      mockEmployeeRepo,
      mockLeavePolicyRepo,
    );
  });

  // ─── submit ───────────────────────────────────────────────

  describe('submit', () => {
    const validDto: CreateLeaveRequestDto = {
      employeeId: 'emp-001',
      leavePolicyId: 'lp-001',
      startDate: makeDate('2026-08-10T00:00:00.000Z'),
      endDate: makeDate('2026-08-14T00:00:00.000Z'),
      reason: 'Vacation',
    };

    beforeEach(() => {
      mockEmployeeRepo.findById.mockResolvedValue(makeEmployee());
      mockLeavePolicyRepo.findById.mockResolvedValue(makeLeavePolicy());
      mockLeaveBalanceRepo.findByEmployeeAndPolicy.mockResolvedValue(makeLeaveBalance());
      mockLeaveRequestRepo.create.mockResolvedValue(
        makeLeaveRequest({ status: LeaveRequestStatus.DRAFT }),
      );
      mockLeaveRequestRepo.updateStatus.mockResolvedValue(
        makeLeaveRequest({ status: LeaveRequestStatus.SUBMITTED }),
      );
      mockLeaveBalanceRepo.updateUsedDays.mockResolvedValue(makeLeaveBalance({ usedDays: 10 }));
    });

    it('should submit a leave request successfully', async () => {
      const result = await service.submit(validDto, 'emp-001', 'employee');

      expect(result.status).toBe(LeaveRequestStatus.SUBMITTED);
      expect(mockLeaveBalanceRepo.updateUsedDays).toHaveBeenCalledWith('lb-001', 9);
      expect(mockLeaveRequestRepo.create).toHaveBeenCalledWith(validDto);
      expect(mockLeaveRequestRepo.updateStatus).toHaveBeenCalledWith(
        'lr-001',
        LeaveRequestStatus.SUBMITTED,
      );
    });

    it('should throw ValidationError when startDate is in the past', async () => {
      const pastDto: CreateLeaveRequestDto = {
        ...validDto,
        startDate: makeDate('2020-01-01T00:00:00.000Z'),
        endDate: makeDate('2020-01-05T00:00:00.000Z'),
      };

      await expect(service.submit(pastDto, 'emp-001', 'employee')).rejects.toThrow(ValidationError);
      await expect(service.submit(pastDto, 'emp-001', 'employee')).rejects.toThrow(
        'startDate must not be in the past',
      );
    });

    it('should throw ValidationError when startDate is after endDate', async () => {
      const invalidDto: CreateLeaveRequestDto = {
        ...validDto,
        startDate: makeDate('2026-08-14T00:00:00.000Z'),
        endDate: makeDate('2026-08-10T00:00:00.000Z'),
      };

      await expect(service.submit(invalidDto, 'emp-001', 'employee')).rejects.toThrow(ValidationError);
      await expect(service.submit(invalidDto, 'emp-001', 'employee')).rejects.toThrow(
        'startDate must be on or before endDate',
      );
    });

    it('should throw ValidationError when minimumNoticeDays is not met', async () => {
      mockLeavePolicyRepo.findById.mockResolvedValue(
        makeLeavePolicy({ minimumNoticeDays: 30 }),
      );

      await expect(service.submit(validDto, 'emp-001', 'employee')).rejects.toThrow(ValidationError);
      await expect(service.submit(validDto, 'emp-001', 'employee')).rejects.toThrow(
        /Request requires at least 30 days notice/,
      );
    });

    it('should throw InsufficientBalanceError when remaining days are less than business days', async () => {
      mockLeaveBalanceRepo.findByEmployeeAndPolicy.mockResolvedValue(
        makeLeaveBalance({ usedDays: 18, totalEntitlement: 20 }),
      );

      await expect(service.submit(validDto, 'emp-001', 'employee')).rejects.toThrow(
        InsufficientBalanceError,
      );
    });

    it('should throw ApproverNotAuthorizedError when employee submits for another employee', async () => {
      await expect(
        service.submit(validDto, 'emp-002', 'employee'),
      ).rejects.toThrow(ApproverNotAuthorizedError);
    });

    it('should allow manager to submit for an employee', async () => {
      const result = await service.submit(validDto, 'mgr-001', 'manager');

      expect(result.status).toBe(LeaveRequestStatus.SUBMITTED);
    });

    it('should allow hr_admin to submit for an employee', async () => {
      const result = await service.submit(validDto, 'hr-001', 'hr_admin');

      expect(result.status).toBe(LeaveRequestStatus.SUBMITTED);
    });

    it('should throw ValidationError when employee is not found', async () => {
      mockEmployeeRepo.findById.mockResolvedValue(null);

      await expect(service.submit(validDto, 'emp-001', 'employee')).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError when leave policy is not found', async () => {
      mockLeavePolicyRepo.findById.mockResolvedValue(null);

      await expect(service.submit(validDto, 'emp-001', 'employee')).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError when no leave balance exists', async () => {
      mockLeaveBalanceRepo.findByEmployeeAndPolicy.mockResolvedValue(null);

      await expect(service.submit(validDto, 'emp-001', 'employee')).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError when no business days in range (weekend-only)', async () => {
      const weekendDto: CreateLeaveRequestDto = {
        ...validDto,
        startDate: makeDate('2026-08-15T00:00:00.000Z'), // Saturday
        endDate: makeDate('2026-08-16T00:00:00.000Z'),   // Sunday
      };

      await expect(service.submit(weekendDto, 'emp-001', 'employee')).rejects.toThrow(ValidationError);
      await expect(service.submit(weekendDto, 'emp-001', 'employee')).rejects.toThrow(
        'Leave request must span at least one business day',
      );
    });

    it('should pass minimumNoticeDays check when policy has no minimumNoticeDays', async () => {
      mockLeavePolicyRepo.findById.mockResolvedValue(
        makeLeavePolicy({ minimumNoticeDays: undefined }),
      );

      const result = await service.submit(validDto, 'emp-001', 'employee');

      expect(result.status).toBe(LeaveRequestStatus.SUBMITTED);
    });

    it('should pass minimumNoticeDays check when policy has minimumNoticeDays of 0', async () => {
      mockLeavePolicyRepo.findById.mockResolvedValue(
        makeLeavePolicy({ minimumNoticeDays: 0 }),
      );

      const result = await service.submit(validDto, 'emp-001', 'employee');

      expect(result.status).toBe(LeaveRequestStatus.SUBMITTED);
    });
  });

  // ─── approve ──────────────────────────────────────────────

  describe('approve', () => {
    const leaveRequest = makeLeaveRequest();

    beforeEach(() => {
      mockLeaveRequestRepo.findById.mockResolvedValue(leaveRequest);
      mockEmployeeRepo.findById.mockResolvedValue(makeEmployee());
      mockLeaveRequestRepo.updateStatus.mockResolvedValue(
        makeLeaveRequest({
          status: LeaveRequestStatus.APPROVED,
          approvedBy: 'mgr-001',
          approvedAt: makeDate('2026-08-02T00:00:00.000Z'),
        }),
      );
    });

    it('should approve a SUBMITTED leave request by the employee\'s manager', async () => {
      const result = await service.approve('lr-001', 'mgr-001', 'manager');

      expect(result.status).toBe(LeaveRequestStatus.APPROVED);
      expect(result.approvedBy).toBe('mgr-001');
      expect(mockLeaveRequestRepo.updateStatus).toHaveBeenCalledWith(
        'lr-001',
        LeaveRequestStatus.APPROVED,
        'mgr-001',
        expect.any(Date),
      );
    });

    it('should approve a SUBMITTED leave request by hr_admin when employee has no manager', async () => {
      mockEmployeeRepo.findById.mockResolvedValue(makeEmployee({ managerId: null }));

      const result = await service.approve('lr-001', 'hr-001', 'hr_admin');

      expect(result.status).toBe(LeaveRequestStatus.APPROVED);
    });

    it('should throw LeaveRequestNotFoundError when leave request does not exist', async () => {
      mockLeaveRequestRepo.findById.mockResolvedValue(null);

      await expect(service.approve('lr-001', 'mgr-001', 'manager')).rejects.toThrow(
        LeaveRequestNotFoundError,
      );
    });

    it('should throw ValidationError when leave request is not in SUBMITTED status', async () => {
      mockLeaveRequestRepo.findById.mockResolvedValue(
        makeLeaveRequest({ status: LeaveRequestStatus.APPROVED }),
      );

      await expect(service.approve('lr-001', 'mgr-001', 'manager')).rejects.toThrow(ValidationError);
    });

    it('should throw ApproverNotAuthorizedError when approver is not the employee\'s manager', async () => {
      await expect(service.approve('lr-001', 'other-mgr', 'manager')).rejects.toThrow(
        ApproverNotAuthorizedError,
      );
    });

    it('should throw ApproverNotAuthorizedError when manager tries to approve for no-manager employee', async () => {
      mockEmployeeRepo.findById.mockResolvedValue(makeEmployee({ managerId: null }));

      await expect(service.approve('lr-001', 'mgr-001', 'manager')).rejects.toThrow(
        ApproverNotAuthorizedError,
      );
    });

    it('should throw ApproverNotAuthorizedError when hr_admin tries to approve for employee with a manager', async () => {
      await expect(service.approve('lr-001', 'hr-001', 'hr_admin')).rejects.toThrow(
        ApproverNotAuthorizedError,
      );
    });

    it('should not change usedDays on approval', async () => {
      await service.approve('lr-001', 'mgr-001', 'manager');

      expect(mockLeaveBalanceRepo.updateUsedDays).not.toHaveBeenCalled();
    });
  });

  // ─── reject ───────────────────────────────────────────────

  describe('reject', () => {
    const leaveRequest = makeLeaveRequest();

    beforeEach(() => {
      mockLeaveRequestRepo.findById.mockResolvedValue(leaveRequest);
      mockEmployeeRepo.findById.mockResolvedValue(makeEmployee());
      mockLeaveRequestRepo.updateStatus.mockResolvedValue(
        makeLeaveRequest({
          status: LeaveRequestStatus.REJECTED,
          approvedBy: 'mgr-001',
          approvedAt: makeDate('2026-08-02T00:00:00.000Z'),
        }),
      );
      mockLeaveBalanceRepo.findByEmployeeAndPolicy.mockResolvedValue(
        makeLeaveBalance({ usedDays: 10 }),
      );
      mockLeaveBalanceRepo.updateUsedDays.mockResolvedValue(
        makeLeaveBalance({ usedDays: 5 }),
      );
    });

    it('should reject a SUBMITTED leave request and restore usedDays', async () => {
      const result = await service.reject('lr-001', 'mgr-001', 'manager');

      expect(result.status).toBe(LeaveRequestStatus.REJECTED);
      expect(mockLeaveBalanceRepo.updateUsedDays).toHaveBeenCalledWith('lb-001', 6);
    });

    it('should reject by hr_admin when employee has no manager', async () => {
      mockEmployeeRepo.findById.mockResolvedValue(makeEmployee({ managerId: null }));

      const result = await service.reject('lr-001', 'hr-001', 'hr_admin');

      expect(result.status).toBe(LeaveRequestStatus.REJECTED);
    });

    it('should throw LeaveRequestNotFoundError when leave request does not exist', async () => {
      mockLeaveRequestRepo.findById.mockResolvedValue(null);

      await expect(service.reject('lr-001', 'mgr-001', 'manager')).rejects.toThrow(
        LeaveRequestNotFoundError,
      );
    });

    it('should throw ValidationError when leave request is not in SUBMITTED status', async () => {
      mockLeaveRequestRepo.findById.mockResolvedValue(
        makeLeaveRequest({ status: LeaveRequestStatus.APPROVED }),
      );

      await expect(service.reject('lr-001', 'mgr-001', 'manager')).rejects.toThrow(ValidationError);
    });

    it('should throw ApproverNotAuthorizedError when rejecter is not the employee\'s manager', async () => {
      await expect(service.reject('lr-001', 'other-mgr', 'manager')).rejects.toThrow(
        ApproverNotAuthorizedError,
      );
    });

    it('should throw ApproverNotAuthorizedError when manager tries to reject for no-manager employee', async () => {
      mockEmployeeRepo.findById.mockResolvedValue(makeEmployee({ managerId: null }));

      await expect(service.reject('lr-001', 'mgr-001', 'manager')).rejects.toThrow(
        ApproverNotAuthorizedError,
      );
    });

    it('should not fail restore if balance is missing', async () => {
      mockLeaveBalanceRepo.findByEmployeeAndPolicy.mockResolvedValue(null);

      const result = await service.reject('lr-001', 'mgr-001', 'manager');

      expect(result.status).toBe(LeaveRequestStatus.REJECTED);
      expect(mockLeaveBalanceRepo.updateUsedDays).not.toHaveBeenCalled();
    });
  });

  // ─── cancel ───────────────────────────────────────────────

  describe('cancel', () => {
    beforeEach(() => {
      mockLeaveBalanceRepo.findByEmployeeAndPolicy.mockResolvedValue(
        makeLeaveBalance({ usedDays: 10 }),
      );
      mockLeaveBalanceRepo.updateUsedDays.mockResolvedValue(
        makeLeaveBalance({ usedDays: 5 }),
      );
    });

    it('should cancel own SUBMITTED leave request and restore usedDays', async () => {
      const leaveRequest = makeLeaveRequest({ status: LeaveRequestStatus.SUBMITTED });
      mockLeaveRequestRepo.findById.mockResolvedValue(leaveRequest);
      mockLeaveRequestRepo.updateStatus.mockResolvedValue(
        makeLeaveRequest({ status: LeaveRequestStatus.CANCELLED }),
      );

      const result = await service.cancel('lr-001', 'emp-001', 'employee');

      expect(result.status).toBe(LeaveRequestStatus.CANCELLED);
      expect(mockLeaveBalanceRepo.updateUsedDays).toHaveBeenCalledWith('lb-001', 6);
    });

    it('should cancel own APPROVED leave request and NOT restore usedDays', async () => {
      const leaveRequest = makeLeaveRequest({ status: LeaveRequestStatus.APPROVED });
      mockLeaveRequestRepo.findById.mockResolvedValue(leaveRequest);
      mockLeaveRequestRepo.updateStatus.mockResolvedValue(
        makeLeaveRequest({ status: LeaveRequestStatus.CANCELLED }),
      );

      const result = await service.cancel('lr-001', 'emp-001', 'employee');

      expect(result.status).toBe(LeaveRequestStatus.CANCELLED);
      expect(mockLeaveBalanceRepo.updateUsedDays).not.toHaveBeenCalled();
    });

    it('should allow manager to cancel employee\'s request', async () => {
      const leaveRequest = makeLeaveRequest({ status: LeaveRequestStatus.SUBMITTED });
      mockLeaveRequestRepo.findById.mockResolvedValue(leaveRequest);
      mockLeaveRequestRepo.updateStatus.mockResolvedValue(
        makeLeaveRequest({ status: LeaveRequestStatus.CANCELLED }),
      );

      const result = await service.cancel('lr-001', 'mgr-001', 'manager');

      expect(result.status).toBe(LeaveRequestStatus.CANCELLED);
    });

    it('should allow hr_admin to cancel employee\'s request', async () => {
      const leaveRequest = makeLeaveRequest({ status: LeaveRequestStatus.SUBMITTED });
      mockLeaveRequestRepo.findById.mockResolvedValue(leaveRequest);
      mockLeaveRequestRepo.updateStatus.mockResolvedValue(
        makeLeaveRequest({ status: LeaveRequestStatus.CANCELLED }),
      );

      const result = await service.cancel('lr-001', 'hr-001', 'hr_admin');

      expect(result.status).toBe(LeaveRequestStatus.CANCELLED);
    });

    it('should throw LeaveRequestNotFoundError when leave request does not exist', async () => {
      mockLeaveRequestRepo.findById.mockResolvedValue(null);

      await expect(service.cancel('lr-001', 'emp-001', 'employee')).rejects.toThrow(
        LeaveRequestNotFoundError,
      );
    });

    it('should throw ValidationError when leave request is in DRAFT status', async () => {
      mockLeaveRequestRepo.findById.mockResolvedValue(
        makeLeaveRequest({ status: LeaveRequestStatus.DRAFT }),
      );

      await expect(service.cancel('lr-001', 'emp-001', 'employee')).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError when leave request is already CANCELLED', async () => {
      mockLeaveRequestRepo.findById.mockResolvedValue(
        makeLeaveRequest({ status: LeaveRequestStatus.CANCELLED }),
      );

      await expect(service.cancel('lr-001', 'emp-001', 'employee')).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError when leave request is REJECTED', async () => {
      mockLeaveRequestRepo.findById.mockResolvedValue(
        makeLeaveRequest({ status: LeaveRequestStatus.REJECTED }),
      );

      await expect(service.cancel('lr-001', 'emp-001', 'employee')).rejects.toThrow(ValidationError);
    });

    it('should throw ApproverNotAuthorizedError when employee cancels another employee\'s request', async () => {
      mockLeaveRequestRepo.findById.mockResolvedValue(
        makeLeaveRequest({ status: LeaveRequestStatus.SUBMITTED }),
      );

      await expect(service.cancel('lr-001', 'emp-002', 'employee')).rejects.toThrow(
        ApproverNotAuthorizedError,
      );
    });

    it('should not fail cancel if balance is missing for SUBMITTED request', async () => {
      mockLeaveBalanceRepo.findByEmployeeAndPolicy.mockResolvedValue(null);
      const leaveRequest = makeLeaveRequest({ status: LeaveRequestStatus.SUBMITTED });
      mockLeaveRequestRepo.findById.mockResolvedValue(leaveRequest);
      mockLeaveRequestRepo.updateStatus.mockResolvedValue(
        makeLeaveRequest({ status: LeaveRequestStatus.CANCELLED }),
      );

      const result = await service.cancel('lr-001', 'emp-001', 'employee');

      expect(result.status).toBe(LeaveRequestStatus.CANCELLED);
      expect(mockLeaveBalanceRepo.updateUsedDays).not.toHaveBeenCalled();
    });
  });

  // ─── getById ──────────────────────────────────────────────

  describe('getById', () => {
    it('should return a leave request when found', async () => {
      const leaveRequest = makeLeaveRequest();
      mockLeaveRequestRepo.findById.mockResolvedValue(leaveRequest);

      const result = await service.getById('lr-001');

      expect(result).toEqual(leaveRequest);
    });

    it('should return null when not found', async () => {
      mockLeaveRequestRepo.findById.mockResolvedValue(null);

      const result = await service.getById('nonexistent');

      expect(result).toBeNull();
    });
  });

  // ─── getByEmployee ────────────────────────────────────────

  describe('getByEmployee', () => {
    it('should return leave requests for an employee', async () => {
      const requests = [makeLeaveRequest(), makeLeaveRequest({ id: 'lr-002' })];
      mockLeaveRequestRepo.findByEmployee.mockResolvedValue(requests);

      const result = await service.getByEmployee('emp-001');

      expect(result).toEqual(requests);
      expect(mockLeaveRequestRepo.findByEmployee).toHaveBeenCalledWith('emp-001');
    });

    it('should return an empty array when employee has no requests', async () => {
      mockLeaveRequestRepo.findByEmployee.mockResolvedValue([]);

      const result = await service.getByEmployee('emp-001');

      expect(result).toEqual([]);
    });
  });
});
