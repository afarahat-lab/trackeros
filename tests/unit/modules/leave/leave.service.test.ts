import { LeaveService, countBusinessDays } from '../../../../src/modules/leave/leave.service';
import { ILeaveRepository } from '../../../../src/modules/leave/leave.repository';
import { IEmployeeService } from '../../../../src/modules/employee';
import { IPolicyService } from '../../../../src/modules/policy';
import { IBalanceService } from '../../../../src/modules/balance';
import { IAuditService } from '../../../../src/modules/audit';
import { LeaveRequest } from '../../../../src/modules/leave/leave.model';
import { LeaveRequestStatus } from '../../../../src/shared/types/leave-request-status.enum';
import { LeaveType } from '../../../../src/shared/types/leave-type.enum';
import { LeavePolicy } from '../../../../src/modules/policy/policy.model';
import {
  InsufficientBalanceError,
  OverlappingRequestError,
  EmployeeNotActiveError,
  MinimumNoticeError,
  NotManagerError,
} from '../../../../src/modules/leave/leave.errors';

function makeLeaveRequest(overrides: Partial<LeaveRequest> = {}): LeaveRequest {
  return {
    id: 'lr-1',
    employeeId: 'emp-1',
    leavePolicyId: 'pol-1',
    startDate: new Date('2026-09-01T00:00:00.000Z'),
    endDate: new Date('2026-09-04T00:00:00.000Z'),
    reason: 'Vacation',
    status: LeaveRequestStatus.DRAFT,
    approvedBy: null,
    approvedAt: null,
    createdAt: new Date('2026-08-10T00:00:00.000Z'),
    updatedAt: new Date('2026-08-10T00:00:00.000Z'),
    ...overrides,
  };
}

function makePolicy(overrides: Partial<LeavePolicy> = {}): LeavePolicy {
  return {
    id: 'pol-1',
    policyName: 'Annual Leave',
    leaveType: LeaveType.ANNUAL,
    entitlementDays: 20,
    accrualRate: null,
    maxAccumulation: 20,
    minimumNoticeDays: 3,
    requiresManagerApproval: true,
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

describe('countBusinessDays', () => {
  it('should count weekdays between two dates inclusive', () => {
    // Mon Aug 17 to Fri Aug 21 = 5 weekdays
    const result = countBusinessDays(
      new Date('2026-08-17T00:00:00.000Z'),
      new Date('2026-08-21T00:00:00.000Z'),
    );
    expect(result).toBe(5);
  });

  it('should exclude Saturday and Sunday', () => {
    // Mon Aug 17 to Sun Aug 23 = 5 weekdays (Mon-Fri)
    const result = countBusinessDays(
      new Date('2026-08-17T00:00:00.000Z'),
      new Date('2026-08-23T00:00:00.000Z'),
    );
    expect(result).toBe(5);
  });

  it('should return 1 for a single weekday', () => {
    const result = countBusinessDays(
      new Date('2026-08-19T00:00:00.000Z'),
      new Date('2026-08-19T00:00:00.000Z'),
    );
    expect(result).toBe(1);
  });

  it('should return 0 for a Saturday-only range', () => {
    const result = countBusinessDays(
      new Date('2026-08-22T00:00:00.000Z'),
      new Date('2026-08-22T00:00:00.000Z'),
    );
    expect(result).toBe(0);
  });

  it('should return 0 for a Sunday-only range', () => {
    const result = countBusinessDays(
      new Date('2026-08-23T00:00:00.000Z'),
      new Date('2026-08-23T00:00:00.000Z'),
    );
    expect(result).toBe(0);
  });

  it('should return 0 when end date is before start date', () => {
    const result = countBusinessDays(
      new Date('2026-08-21T00:00:00.000Z'),
      new Date('2026-08-17T00:00:00.000Z'),
    );
    expect(result).toBe(0);
  });

  it('should handle a full week (Mon-Sun) as 5 days', () => {
    const result = countBusinessDays(
      new Date('2026-08-17T00:00:00.000Z'),
      new Date('2026-08-23T00:00:00.000Z'),
    );
    expect(result).toBe(5);
  });

  it('should handle a two-week range as 10 days', () => {
    const result = countBusinessDays(
      new Date('2026-08-17T00:00:00.000Z'),
      new Date('2026-08-28T00:00:00.000Z'),
    );
    expect(result).toBe(10);
  });

  it('should handle Friday to Monday as 2 days', () => {
    const result = countBusinessDays(
      new Date('2026-08-21T00:00:00.000Z'),
      new Date('2026-08-24T00:00:00.000Z'),
    );
    expect(result).toBe(2);
  });
});

describe('LeaveService', () => {
  let service: LeaveService;
  let mockLeaveRepo: jest.Mocked<ILeaveRepository>;
  let mockEmployeeService: jest.Mocked<IEmployeeService>;
  let mockPolicyService: jest.Mocked<IPolicyService>;
  let mockBalanceService: jest.Mocked<IBalanceService>;
  let mockAuditService: jest.Mocked<IAuditService>;

  beforeEach(() => {
    mockLeaveRepo = {
      findById: jest.fn(),
      findByEmployee: jest.fn(),
      findByEmployeeAndStatus: jest.fn(),
      findOverlapping: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findPendingByEmployee: jest.fn(),
    } as jest.Mocked<ILeaveRepository>;

    mockEmployeeService = {
      getById: jest.fn(),
      getByEmployeeNumber: jest.fn(),
      isActive: jest.fn(),
      getManagerId: jest.fn(),
    } as jest.Mocked<IEmployeeService>;

    mockPolicyService = {
      getById: jest.fn(),
      getByLeaveType: jest.fn(),
      getAllActive: jest.fn(),
    } as jest.Mocked<IPolicyService>;

    mockBalanceService = {
      getBalance: jest.fn(),
      getAvailableDays: jest.fn(),
      reserveDays: jest.fn(),
      releaseReservation: jest.fn(),
      deductDays: jest.fn(),
      initializeBalancesForEmployee: jest.fn(),
    } as jest.Mocked<IBalanceService>;

    mockAuditService = {
      log: jest.fn(),
    } as jest.Mocked<IAuditService>;

    service = new LeaveService(
      mockLeaveRepo,
      mockEmployeeService,
      mockPolicyService,
      mockBalanceService,
      mockAuditService,
    );
  });

  describe('createDraft', () => {
    it('should create a draft leave request and audit it', async () => {
      const dto = {
        employeeId: 'emp-1',
        leavePolicyId: 'pol-1',
        startDate: new Date('2026-08-17T00:00:00.000Z'),
        endDate: new Date('2026-08-21T00:00:00.000Z'),
        reason: 'Vacation',
      };

      const created = makeLeaveRequest({ status: LeaveRequestStatus.DRAFT });
      mockLeaveRepo.create.mockResolvedValueOnce(created);

      const result = await service.createDraft(dto);

      expect(result).toEqual(created);
      expect(mockLeaveRepo.create).toHaveBeenCalledWith({
        employeeId: 'emp-1',
        leavePolicyId: 'pol-1',
        startDate: dto.startDate,
        endDate: dto.endDate,
        reason: 'Vacation',
        status: LeaveRequestStatus.DRAFT,
        approvedBy: null,
        approvedAt: null,
      });
      expect(mockAuditService.log).toHaveBeenCalledWith({
        entityType: 'LeaveRequest',
        entityId: 'lr-1',
        action: 'createDraft',
        oldValues: null,
        newValues: expect.objectContaining({ status: 'DRAFT' }),
        performedBy: 'emp-1',
      });
    });

    it('should handle undefined reason', async () => {
      const dto = {
        employeeId: 'emp-1',
        leavePolicyId: 'pol-1',
        startDate: new Date('2026-08-17T00:00:00.000Z'),
        endDate: new Date('2026-08-21T00:00:00.000Z'),
      };

      const created = makeLeaveRequest({ status: LeaveRequestStatus.DRAFT, reason: undefined });
      mockLeaveRepo.create.mockResolvedValueOnce(created);

      const result = await service.createDraft(dto);

      expect(result.reason).toBeUndefined();
    });
  });

  describe('submitDraft', () => {
    it('should submit a draft request successfully', async () => {
      const draft = makeLeaveRequest({ status: LeaveRequestStatus.DRAFT });
      const submitted = makeLeaveRequest({ status: LeaveRequestStatus.SUBMITTED });
      const policy = makePolicy();

      mockLeaveRepo.findById.mockResolvedValueOnce(draft);
      mockEmployeeService.isActive.mockResolvedValueOnce(true);
      mockLeaveRepo.findOverlapping.mockResolvedValueOnce([]);
      mockPolicyService.getById.mockResolvedValueOnce(policy);
      mockBalanceService.getAvailableDays.mockResolvedValueOnce(20);
      mockBalanceService.reserveDays.mockResolvedValueOnce(undefined);
      mockLeaveRepo.update.mockResolvedValueOnce(submitted);

      const result = await service.submitDraft('lr-1', 'emp-1');

      expect(result).toEqual(submitted);
      expect(mockBalanceService.reserveDays).toHaveBeenCalledWith('emp-1', 'pol-1', 4);
      expect(mockLeaveRepo.update).toHaveBeenCalledWith('lr-1', {
        status: LeaveRequestStatus.SUBMITTED,
      });
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'LeaveRequest',
          entityId: 'lr-1',
          action: 'submitDraft',
          performedBy: 'emp-1',
        }),
      );
    });

    it('should throw when request is not found', async () => {
      mockLeaveRepo.findById.mockResolvedValueOnce(null);

      await expect(service.submitDraft('nonexistent', 'emp-1')).rejects.toThrow(
        'Leave request not found',
      );
    });

    it('should throw when request is not in DRAFT status', async () => {
      const submitted = makeLeaveRequest({ status: LeaveRequestStatus.SUBMITTED });
      mockLeaveRepo.findById.mockResolvedValueOnce(submitted);

      await expect(service.submitDraft('lr-1', 'emp-1')).rejects.toThrow(
        'Only draft requests can be submitted',
      );
    });

    it('should throw when employeeId does not match', async () => {
      const draft = makeLeaveRequest({ status: LeaveRequestStatus.DRAFT, employeeId: 'emp-2' });
      mockLeaveRepo.findById.mockResolvedValueOnce(draft);

      await expect(service.submitDraft('lr-1', 'emp-1')).rejects.toThrow(
        'Only the owning employee may submit their own draft',
      );
    });

    it('should throw EmployeeNotActiveError when employee is not active', async () => {
      const draft = makeLeaveRequest({ status: LeaveRequestStatus.DRAFT });
      mockLeaveRepo.findById.mockResolvedValueOnce(draft);
      mockEmployeeService.isActive.mockResolvedValueOnce(false);

      await expect(service.submitDraft('lr-1', 'emp-1')).rejects.toThrow(EmployeeNotActiveError);
    });

    it('should throw OverlappingRequestError when overlapping requests exist', async () => {
      const draft = makeLeaveRequest({ status: LeaveRequestStatus.DRAFT });
      const overlapping = makeLeaveRequest({ id: 'lr-2', status: LeaveRequestStatus.SUBMITTED });

      mockLeaveRepo.findById.mockResolvedValueOnce(draft);
      mockEmployeeService.isActive.mockResolvedValueOnce(true);
      mockLeaveRepo.findOverlapping.mockResolvedValueOnce([overlapping]);

      await expect(service.submitDraft('lr-1', 'emp-1')).rejects.toThrow(OverlappingRequestError);
    });

    it('should throw when policy is not found', async () => {
      const draft = makeLeaveRequest({ status: LeaveRequestStatus.DRAFT });
      mockLeaveRepo.findById.mockResolvedValueOnce(draft);
      mockEmployeeService.isActive.mockResolvedValueOnce(true);
      mockLeaveRepo.findOverlapping.mockResolvedValueOnce([]);
      mockPolicyService.getById.mockResolvedValueOnce(null);

      await expect(service.submitDraft('lr-1', 'emp-1')).rejects.toThrow(
        'Leave policy not found',
      );
    });

    it('should throw MinimumNoticeError when notice period is insufficient', async () => {
      const draft = makeLeaveRequest({
        status: LeaveRequestStatus.DRAFT,
        startDate: new Date('2026-08-18T00:00:00.000Z'),
      });
      const policy = makePolicy({ minimumNoticeDays: 7 });

      mockLeaveRepo.findById.mockResolvedValueOnce(draft);
      mockEmployeeService.isActive.mockResolvedValueOnce(true);
      mockLeaveRepo.findOverlapping.mockResolvedValueOnce([]);
      mockPolicyService.getById.mockResolvedValueOnce(policy);

      await expect(service.submitDraft('lr-1', 'emp-1')).rejects.toThrow(MinimumNoticeError);
    });

    it('should bypass minimum notice for emergency leave', async () => {
      const draft = makeLeaveRequest({
        status: LeaveRequestStatus.DRAFT,
        leavePolicyId: 'pol-emergency',
        startDate: new Date('2026-08-18T00:00:00.000Z'),
      });
      const policy = makePolicy({
        id: 'pol-emergency',
        leaveType: LeaveType.EMERGENCY,
        minimumNoticeDays: 7,
      });
      const submitted = makeLeaveRequest({
        status: LeaveRequestStatus.SUBMITTED,
        leavePolicyId: 'pol-emergency',
      });

      mockLeaveRepo.findById.mockResolvedValueOnce(draft);
      mockEmployeeService.isActive.mockResolvedValueOnce(true);
      mockLeaveRepo.findOverlapping.mockResolvedValueOnce([]);
      mockPolicyService.getById.mockResolvedValueOnce(policy);
      mockBalanceService.getAvailableDays.mockResolvedValueOnce(10);
      mockBalanceService.reserveDays.mockResolvedValueOnce(undefined);
      mockLeaveRepo.update.mockResolvedValueOnce(submitted);

      const result = await service.submitDraft('lr-1', 'emp-1');

      expect(result.status).toBe(LeaveRequestStatus.SUBMITTED);
    });

    it('should throw InsufficientBalanceError when balance is insufficient', async () => {
      const draft = makeLeaveRequest({ status: LeaveRequestStatus.DRAFT });
      const policy = makePolicy();

      mockLeaveRepo.findById.mockResolvedValueOnce(draft);
      mockEmployeeService.isActive.mockResolvedValueOnce(true);
      mockLeaveRepo.findOverlapping.mockResolvedValueOnce([]);
      mockPolicyService.getById.mockResolvedValueOnce(policy);
      mockBalanceService.getAvailableDays.mockResolvedValueOnce(2);

      await expect(service.submitDraft('lr-1', 'emp-1')).rejects.toThrow(InsufficientBalanceError);
    });

    it('should allow submitting when available balance equals requested days', async () => {
      const draft = makeLeaveRequest({ status: LeaveRequestStatus.DRAFT });
      const policy = makePolicy();
      const submitted = makeLeaveRequest({ status: LeaveRequestStatus.SUBMITTED });

      mockLeaveRepo.findById.mockResolvedValueOnce(draft);
      mockEmployeeService.isActive.mockResolvedValueOnce(true);
      mockLeaveRepo.findOverlapping.mockResolvedValueOnce([]);
      mockPolicyService.getById.mockResolvedValueOnce(policy);
      mockBalanceService.getAvailableDays.mockResolvedValueOnce(4);
      mockBalanceService.reserveDays.mockResolvedValueOnce(undefined);
      mockLeaveRepo.update.mockResolvedValueOnce(submitted);

      const result = await service.submitDraft('lr-1', 'emp-1');

      expect(result.status).toBe(LeaveRequestStatus.SUBMITTED);
    });
  });

  describe('approve', () => {
    it('should approve a submitted request as the manager', async () => {
      const submitted = makeLeaveRequest({ status: LeaveRequestStatus.SUBMITTED });
      const approved = makeLeaveRequest({
        status: LeaveRequestStatus.APPROVED,
        approvedBy: 'mgr-1',
        approvedAt: new Date('2026-08-16T00:00:00.000Z'),
      });
      const policy = makePolicy({ requiresManagerApproval: true });

      mockLeaveRepo.findById.mockResolvedValueOnce(submitted);
      mockEmployeeService.getManagerId.mockResolvedValueOnce('mgr-1');
      mockPolicyService.getById.mockResolvedValueOnce(policy);
      mockBalanceService.deductDays.mockResolvedValueOnce(undefined);
      mockLeaveRepo.update.mockResolvedValueOnce(approved);

      const result = await service.approve('lr-1', 'mgr-1', 'manager');

      expect(result).toEqual(approved);
      expect(mockBalanceService.deductDays).toHaveBeenCalledWith('emp-1', 'pol-1', 4);
      expect(mockLeaveRepo.update).toHaveBeenCalledWith('lr-1', {
        status: LeaveRequestStatus.APPROVED,
        approvedBy: 'mgr-1',
        approvedAt: expect.any(Date),
      });
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'LeaveRequest',
          entityId: 'lr-1',
          action: 'approve',
          performedBy: 'mgr-1',
        }),
      );
    });

    it('should approve as hr_admin when manager is null', async () => {
      const submitted = makeLeaveRequest({ status: LeaveRequestStatus.SUBMITTED });
      const approved = makeLeaveRequest({
        status: LeaveRequestStatus.APPROVED,
        approvedBy: 'hr-1',
        approvedAt: new Date('2026-08-16T00:00:00.000Z'),
      });
      const policy = makePolicy({ requiresManagerApproval: true });

      mockLeaveRepo.findById.mockResolvedValueOnce(submitted);
      mockEmployeeService.getManagerId.mockResolvedValueOnce(null);
      mockPolicyService.getById.mockResolvedValueOnce(policy);
      mockBalanceService.deductDays.mockResolvedValueOnce(undefined);
      mockLeaveRepo.update.mockResolvedValueOnce(approved);

      const result = await service.approve('lr-1', 'hr-1', 'hr_admin');

      expect(result).toEqual(approved);
    });

    it('should approve as hr_admin even when not the direct manager', async () => {
      const submitted = makeLeaveRequest({ status: LeaveRequestStatus.SUBMITTED });
      const approved = makeLeaveRequest({
        status: LeaveRequestStatus.APPROVED,
        approvedBy: 'hr-1',
        approvedAt: new Date('2026-08-16T00:00:00.000Z'),
      });
      const policy = makePolicy({ requiresManagerApproval: true });

      mockLeaveRepo.findById.mockResolvedValueOnce(submitted);
      mockEmployeeService.getManagerId.mockResolvedValueOnce('mgr-1');
      mockPolicyService.getById.mockResolvedValueOnce(policy);
      mockBalanceService.deductDays.mockResolvedValueOnce(undefined);
      mockLeaveRepo.update.mockResolvedValueOnce(approved);

      const result = await service.approve('lr-1', 'hr-1', 'hr_admin');

      expect(result).toEqual(approved);
    });

    it('should throw NotManagerError when approver is not the manager and not hr_admin', async () => {
      const submitted = makeLeaveRequest({ status: LeaveRequestStatus.SUBMITTED });

      mockLeaveRepo.findById.mockResolvedValueOnce(submitted);
      mockEmployeeService.getManagerId.mockResolvedValueOnce('mgr-1');

      await expect(service.approve('lr-1', 'other-mgr', 'manager')).rejects.toThrow(
        NotManagerError,
      );
    });

    it('should throw NotManagerError on self-approval', async () => {
      const submitted = makeLeaveRequest({
        status: LeaveRequestStatus.SUBMITTED,
        employeeId: 'emp-1',
      });

      mockLeaveRepo.findById.mockResolvedValueOnce(submitted);

      await expect(service.approve('lr-1', 'emp-1', 'manager')).rejects.toThrow(NotManagerError);
    });

    it('should throw when request is not in SUBMITTED status', async () => {
      const draft = makeLeaveRequest({ status: LeaveRequestStatus.DRAFT });
      mockLeaveRepo.findById.mockResolvedValueOnce(draft);

      await expect(service.approve('lr-1', 'mgr-1', 'manager')).rejects.toThrow(
        'Only submitted requests can be approved',
      );
    });

    it('should throw when request is not found', async () => {
      mockLeaveRepo.findById.mockResolvedValueOnce(null);

      await expect(service.approve('nonexistent', 'mgr-1', 'manager')).rejects.toThrow(
        'Leave request not found',
      );
    });

    it('should not set approvedBy/approvedAt when requiresManagerApproval is false', async () => {
      const submitted = makeLeaveRequest({ status: LeaveRequestStatus.SUBMITTED });
      const approved = makeLeaveRequest({
        status: LeaveRequestStatus.APPROVED,
        approvedBy: null,
        approvedAt: null,
      });
      const policy = makePolicy({ requiresManagerApproval: false });

      mockLeaveRepo.findById.mockResolvedValueOnce(submitted);
      mockEmployeeService.getManagerId.mockResolvedValueOnce('mgr-1');
      mockPolicyService.getById.mockResolvedValueOnce(policy);
      mockBalanceService.deductDays.mockResolvedValueOnce(undefined);
      mockLeaveRepo.update.mockResolvedValueOnce(approved);

      const result = await service.approve('lr-1', 'mgr-1', 'manager');

      expect(result.approvedBy).toBeNull();
      expect(result.approvedAt).toBeNull();
      expect(mockLeaveRepo.update).toHaveBeenCalledWith('lr-1', {
        status: LeaveRequestStatus.APPROVED,
      });
    });

    it('should throw NotManagerError when manager is null and approver is not hr_admin', async () => {
      const submitted = makeLeaveRequest({ status: LeaveRequestStatus.SUBMITTED });

      mockLeaveRepo.findById.mockResolvedValueOnce(submitted);
      mockEmployeeService.getManagerId.mockResolvedValueOnce(null);

      await expect(service.approve('lr-1', 'mgr-1', 'manager')).rejects.toThrow(NotManagerError);
    });
  });

  describe('reject', () => {
    it('should reject a submitted request as the manager', async () => {
      const submitted = makeLeaveRequest({ status: LeaveRequestStatus.SUBMITTED });
      const rejected = makeLeaveRequest({ status: LeaveRequestStatus.REJECTED });
      const policy = makePolicy();

      mockLeaveRepo.findById.mockResolvedValueOnce(submitted);
      mockEmployeeService.getManagerId.mockResolvedValueOnce('mgr-1');
      mockPolicyService.getById.mockResolvedValueOnce(policy);
      mockBalanceService.releaseReservation.mockResolvedValueOnce(undefined);
      mockLeaveRepo.update.mockResolvedValueOnce(rejected);

      const result = await service.reject('lr-1', 'mgr-1', 'manager');

      expect(result).toEqual(rejected);
      expect(mockBalanceService.releaseReservation).toHaveBeenCalledWith('emp-1', 'pol-1', 4);
      expect(mockLeaveRepo.update).toHaveBeenCalledWith('lr-1', {
        status: LeaveRequestStatus.REJECTED,
      });
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'LeaveRequest',
          entityId: 'lr-1',
          action: 'reject',
          performedBy: 'mgr-1',
        }),
      );
    });

    it('should reject as hr_admin when manager is null', async () => {
      const submitted = makeLeaveRequest({ status: LeaveRequestStatus.SUBMITTED });
      const rejected = makeLeaveRequest({ status: LeaveRequestStatus.REJECTED });
      const policy = makePolicy();

      mockLeaveRepo.findById.mockResolvedValueOnce(submitted);
      mockEmployeeService.getManagerId.mockResolvedValueOnce(null);
      mockPolicyService.getById.mockResolvedValueOnce(policy);
      mockBalanceService.releaseReservation.mockResolvedValueOnce(undefined);
      mockLeaveRepo.update.mockResolvedValueOnce(rejected);

      const result = await service.reject('lr-1', 'hr-1', 'hr_admin');

      expect(result).toEqual(rejected);
    });

    it('should throw NotManagerError on self-rejection', async () => {
      const submitted = makeLeaveRequest({
        status: LeaveRequestStatus.SUBMITTED,
        employeeId: 'emp-1',
      });

      mockLeaveRepo.findById.mockResolvedValueOnce(submitted);

      await expect(service.reject('lr-1', 'emp-1', 'manager')).rejects.toThrow(NotManagerError);
    });

    it('should throw when request is not in SUBMITTED status', async () => {
      const draft = makeLeaveRequest({ status: LeaveRequestStatus.DRAFT });
      mockLeaveRepo.findById.mockResolvedValueOnce(draft);

      await expect(service.reject('lr-1', 'mgr-1', 'manager')).rejects.toThrow(
        'Only submitted requests can be rejected',
      );
    });

    it('should throw NotManagerError when approver is not the manager and not hr_admin', async () => {
      const submitted = makeLeaveRequest({ status: LeaveRequestStatus.SUBMITTED });

      mockLeaveRepo.findById.mockResolvedValueOnce(submitted);
      mockEmployeeService.getManagerId.mockResolvedValueOnce('mgr-1');

      await expect(service.reject('lr-1', 'other-mgr', 'manager')).rejects.toThrow(NotManagerError);
    });
  });

  describe('cancel', () => {
    it('should cancel a DRAFT request without releasing reservation', async () => {
      const draft = makeLeaveRequest({ status: LeaveRequestStatus.DRAFT });
      const cancelled = makeLeaveRequest({ status: LeaveRequestStatus.CANCELLED });

      mockLeaveRepo.findById.mockResolvedValueOnce(draft);
      mockLeaveRepo.update.mockResolvedValueOnce(cancelled);

      const result = await service.cancel('lr-1', 'emp-1');

      expect(result).toEqual(cancelled);
      expect(mockBalanceService.releaseReservation).not.toHaveBeenCalled();
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'LeaveRequest',
          entityId: 'lr-1',
          action: 'cancel',
          performedBy: 'emp-1',
        }),
      );
    });

    it('should cancel a SUBMITTED request and release reservation', async () => {
      const submitted = makeLeaveRequest({ status: LeaveRequestStatus.SUBMITTED });
      const cancelled = makeLeaveRequest({ status: LeaveRequestStatus.CANCELLED });

      mockLeaveRepo.findById.mockResolvedValueOnce(submitted);
      mockBalanceService.releaseReservation.mockResolvedValueOnce(undefined);
      mockLeaveRepo.update.mockResolvedValueOnce(cancelled);

      const result = await service.cancel('lr-1', 'emp-1');

      expect(result).toEqual(cancelled);
      expect(mockBalanceService.releaseReservation).toHaveBeenCalledWith('emp-1', 'pol-1', 4);
    });

    it('should cancel an APPROVED request and release reservation', async () => {
      const approved = makeLeaveRequest({ status: LeaveRequestStatus.APPROVED });
      const cancelled = makeLeaveRequest({ status: LeaveRequestStatus.CANCELLED });

      mockLeaveRepo.findById.mockResolvedValueOnce(approved);
      mockBalanceService.releaseReservation.mockResolvedValueOnce(undefined);
      mockLeaveRepo.update.mockResolvedValueOnce(cancelled);

      const result = await service.cancel('lr-1', 'emp-1');

      expect(result).toEqual(cancelled);
      expect(mockBalanceService.releaseReservation).toHaveBeenCalledWith('emp-1', 'pol-1', 4);
    });

    it('should throw when employeeId does not match', async () => {
      const draft = makeLeaveRequest({ status: LeaveRequestStatus.DRAFT, employeeId: 'emp-2' });
      mockLeaveRepo.findById.mockResolvedValueOnce(draft);

      await expect(service.cancel('lr-1', 'emp-1')).rejects.toThrow(
        'Only the owning employee may cancel their own request',
      );
    });

    it('should throw when request is already REJECTED', async () => {
      const rejected = makeLeaveRequest({ status: LeaveRequestStatus.REJECTED });
      mockLeaveRepo.findById.mockResolvedValueOnce(rejected);

      await expect(service.cancel('lr-1', 'emp-1')).rejects.toThrow(
        'Cannot cancel a request that is already in a terminal state',
      );
    });

    it('should throw when request is already CANCELLED', async () => {
      const cancelled = makeLeaveRequest({ status: LeaveRequestStatus.CANCELLED });
      mockLeaveRepo.findById.mockResolvedValueOnce(cancelled);

      await expect(service.cancel('lr-1', 'emp-1')).rejects.toThrow(
        'Cannot cancel a request that is already in a terminal state',
      );
    });

    it('should throw when request is not found', async () => {
      mockLeaveRepo.findById.mockResolvedValueOnce(null);

      await expect(service.cancel('nonexistent', 'emp-1')).rejects.toThrow(
        'Leave request not found',
      );
    });
  });

  describe('getById', () => {
    it('should return the leave request when found', async () => {
      const request = makeLeaveRequest();
      mockLeaveRepo.findById.mockResolvedValueOnce(request);

      const result = await service.getById('lr-1');

      expect(result).toEqual(request);
    });

    it('should return null when not found', async () => {
      mockLeaveRepo.findById.mockResolvedValueOnce(null);

      const result = await service.getById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getByEmployee', () => {
    it('should return all leave requests for the employee', async () => {
      const requests = [
        makeLeaveRequest({ id: 'lr-1' }),
        makeLeaveRequest({ id: 'lr-2' }),
      ];
      mockLeaveRepo.findByEmployee.mockResolvedValueOnce(requests);

      const result = await service.getByEmployee('emp-1');

      expect(result).toEqual(requests);
      expect(mockLeaveRepo.findByEmployee).toHaveBeenCalledWith('emp-1');
    });

    it('should return empty array when no requests exist', async () => {
      mockLeaveRepo.findByEmployee.mockResolvedValueOnce([]);

      const result = await service.getByEmployee('emp-1');

      expect(result).toEqual([]);
    });
  });

  describe('audit logging', () => {
    it('should audit all state transitions', async () => {
      // createDraft
      const draft = makeLeaveRequest({ status: LeaveRequestStatus.DRAFT });
      mockLeaveRepo.create.mockResolvedValueOnce(draft);
      await service.createDraft({
        employeeId: 'emp-1',
        leavePolicyId: 'pol-1',
        startDate: new Date('2026-08-17T00:00:00.000Z'),
        endDate: new Date('2026-08-21T00:00:00.000Z'),
      });
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'createDraft' }),
      );

      jest.clearAllMocks();

      // submitDraft
      const submitted = makeLeaveRequest({ status: LeaveRequestStatus.SUBMITTED });
      const policy = makePolicy();
      mockLeaveRepo.findById.mockResolvedValueOnce(draft);
      mockEmployeeService.isActive.mockResolvedValueOnce(true);
      mockLeaveRepo.findOverlapping.mockResolvedValueOnce([]);
      mockPolicyService.getById.mockResolvedValueOnce(policy);
      mockBalanceService.getAvailableDays.mockResolvedValueOnce(20);
      mockBalanceService.reserveDays.mockResolvedValueOnce(undefined);
      mockLeaveRepo.update.mockResolvedValueOnce(submitted);
      await service.submitDraft('lr-1', 'emp-1');
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'submitDraft' }),
      );

      jest.clearAllMocks();

      // approve
      const approved = makeLeaveRequest({
        status: LeaveRequestStatus.APPROVED,
        approvedBy: 'mgr-1',
        approvedAt: new Date(),
      });
      mockLeaveRepo.findById.mockResolvedValueOnce(submitted);
      mockEmployeeService.getManagerId.mockResolvedValueOnce('mgr-1');
      mockPolicyService.getById.mockResolvedValueOnce(policy);
      mockBalanceService.deductDays.mockResolvedValueOnce(undefined);
      mockLeaveRepo.update.mockResolvedValueOnce(approved);
      await service.approve('lr-1', 'mgr-1', 'manager');
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'approve' }),
      );
    });
  });
});
