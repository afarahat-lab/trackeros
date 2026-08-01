import { LeaveService } from 'modules/leave/leave.service';
import {
  AuditAction,
  EmploymentStatus,
  LeaveRequestStatus,
  LeaveType,
} from 'shared/types';
import { InsufficientBalanceError } from 'modules/balance/balance.model';

jest.mock('shared/utils/day-count', () => ({
  calculateBusinessDays: jest.fn(),
  getHolidaysForYear: jest.fn(),
}));

import { calculateBusinessDays, getHolidaysForYear } from 'shared/utils/day-count';

const mockCalculateBusinessDays = calculateBusinessDays as jest.Mock;
const mockGetHolidaysForYear = getHolidaysForYear as jest.Mock;

function makeEmployee(overrides: Record<string, unknown> = {}) {
  return {
    id: 'emp-1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    role: 'employee',
    managerId: 'mgr-1',
    department: 'Engineering',
    employmentStatus: EmploymentStatus.ACTIVE,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

function makePolicy(overrides: Record<string, unknown> = {}) {
  return {
    id: 'pol-1',
    policyName: 'Annual Leave',
    leaveType: LeaveType.ANNUAL,
    entitlementDays: 20,
    accrualRate: null,
    maxAccumulation: null,
    minimumNoticeDays: null,
    requiresManagerApproval: true,
    isActive: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

function makeBalance(overrides: Record<string, unknown> = {}) {
  return {
    id: 'bal-1',
    employeeId: 'emp-1',
    policyId: 'pol-1',
    totalEntitlement: 20,
    usedDays: 0,
    remainingDays: 20,
    fiscalYear: 2026,
    status: 'ACTIVE' as const,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

function makeLeaveRequest(overrides: Record<string, unknown> = {}) {
  return {
    id: 'lr-1',
    employeeId: 'emp-1',
    policyId: 'pol-1',
    startDate: new Date('2026-07-01'),
    endDate: new Date('2026-07-03'),
    reason: 'Vacation',
    status: LeaveRequestStatus.SUBMITTED,
    approvedBy: null,
    approvedAt: null,
    rejectionReason: null,
    createdAt: new Date('2026-06-15'),
    updatedAt: new Date('2026-06-15'),
    ...overrides,
  };
}

describe('LeaveService', () => {
  let service: LeaveService;
  let mockLeaveRepo: {
    findById: jest.Mock;
    findByEmployeeId: jest.Mock;
    findByStatus: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    updateStatus: jest.Mock;
  };
  let mockBalanceRepo: {
    findByEmployeeAndPolicy: jest.Mock;
    findByEmployeeId: jest.Mock;
    create: jest.Mock;
    updateUsedDays: jest.Mock;
    incrementUsedDays: jest.Mock;
    decrementUsedDays: jest.Mock;
  };
  let mockEmployeeRepo: {
    findById: jest.Mock;
    findByDepartment: jest.Mock;
    findAll: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
  let mockPolicyRepo: {
    findById: jest.Mock;
    findByLeaveType: jest.Mock;
    findActive: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
  let mockNotificationRepo: {
    findByRecipientId: jest.Mock;
    create: jest.Mock;
    markAsRead: jest.Mock;
    updateStatus: jest.Mock;
  };
  let mockAuditRepo: {
    findByEntity: jest.Mock;
    findByPerformer: jest.Mock;
    create: jest.Mock;
  };

  beforeEach(() => {
    mockLeaveRepo = {
      findById: jest.fn(),
      findByEmployeeId: jest.fn(),
      findByStatus: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateStatus: jest.fn(),
    };
    mockBalanceRepo = {
      findByEmployeeAndPolicy: jest.fn(),
      findByEmployeeId: jest.fn(),
      create: jest.fn(),
      updateUsedDays: jest.fn(),
      incrementUsedDays: jest.fn(),
      decrementUsedDays: jest.fn(),
    };
    mockEmployeeRepo = {
      findById: jest.fn(),
      findByDepartment: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };
    mockPolicyRepo = {
      findById: jest.fn(),
      findByLeaveType: jest.fn(),
      findActive: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };
    mockNotificationRepo = {
      findByRecipientId: jest.fn(),
      create: jest.fn(),
      markAsRead: jest.fn(),
      updateStatus: jest.fn(),
    };
    mockAuditRepo = {
      findByEntity: jest.fn(),
      findByPerformer: jest.fn(),
      create: jest.fn(),
    };

    service = new LeaveService(
      mockLeaveRepo,
      mockBalanceRepo,
      mockEmployeeRepo,
      mockPolicyRepo,
      mockNotificationRepo,
      mockAuditRepo,
    );

    mockCalculateBusinessDays.mockReset();
    mockGetHolidaysForYear.mockReset();
  });

  // ── submitLeaveRequest ──────────────────────────────────────────

  describe('submitLeaveRequest', () => {
    const dto = {
      employeeId: 'emp-1',
      policyId: 'pol-1',
      startDate: new Date('2026-07-01'),
      endDate: new Date('2026-07-03'),
      reason: 'Vacation',
    };

    it('should throw if employee not found', async () => {
      mockEmployeeRepo.findById.mockResolvedValue(null);

      await expect(service.submitLeaveRequest(dto)).rejects.toThrow(
        'Employee not found: emp-1',
      );
    });

    it('should throw if employee is not ACTIVE', async () => {
      mockEmployeeRepo.findById.mockResolvedValue(
        makeEmployee({ employmentStatus: EmploymentStatus.INACTIVE }),
      );

      await expect(service.submitLeaveRequest(dto)).rejects.toThrow(
        'Employee is not active: status=INACTIVE',
      );
    });

    it('should throw if policy not found', async () => {
      mockEmployeeRepo.findById.mockResolvedValue(makeEmployee());
      mockPolicyRepo.findById.mockResolvedValue(null);

      await expect(service.submitLeaveRequest(dto)).rejects.toThrow(
        'Policy not found: pol-1',
      );
    });

    it('should throw if policy is not active', async () => {
      mockEmployeeRepo.findById.mockResolvedValue(makeEmployee());
      mockPolicyRepo.findById.mockResolvedValue(makePolicy({ isActive: false }));

      await expect(service.submitLeaveRequest(dto)).rejects.toThrow(
        'Policy is not active: pol-1',
      );
    });

    it('should create balance if none exists', async () => {
      const employee = makeEmployee();
      const policy = makePolicy();
      const balance = makeBalance();
      const leaveRequest = makeLeaveRequest();

      mockEmployeeRepo.findById.mockResolvedValue(employee);
      mockPolicyRepo.findById.mockResolvedValue(policy);
      mockBalanceRepo.findByEmployeeAndPolicy.mockResolvedValue(null);
      mockBalanceRepo.create.mockResolvedValue(balance);
      mockGetHolidaysForYear.mockResolvedValue([]);
      mockCalculateBusinessDays.mockReturnValue(3);
      mockBalanceRepo.incrementUsedDays.mockResolvedValue(balance);
      mockLeaveRepo.create.mockResolvedValue(leaveRequest);
      mockAuditRepo.create.mockResolvedValue({});
      mockNotificationRepo.create.mockResolvedValue({});

      const result = await service.submitLeaveRequest(dto);

      expect(mockBalanceRepo.create).toHaveBeenCalledWith({
        employeeId: 'emp-1',
        policyId: 'pol-1',
        totalEntitlement: 20,
        usedDays: 0,
        fiscalYear: 2026,
        status: 'ACTIVE',
      });
      expect(result).toBe(leaveRequest);
    });

    it('should throw InsufficientBalanceError when balance is insufficient', async () => {
      const employee = makeEmployee();
      const policy = makePolicy();
      const balance = makeBalance({ usedDays: 18, totalEntitlement: 20 });

      mockEmployeeRepo.findById.mockResolvedValue(employee);
      mockPolicyRepo.findById.mockResolvedValue(policy);
      mockBalanceRepo.findByEmployeeAndPolicy.mockResolvedValue(balance);
      mockGetHolidaysForYear.mockResolvedValue([]);
      mockCalculateBusinessDays.mockReturnValue(3);

      await expect(service.submitLeaveRequest(dto)).rejects.toThrow(
        InsufficientBalanceError,
      );
      await expect(service.submitLeaveRequest(dto)).rejects.toThrow(
        'Insufficient balance: requested 3 day(s) but only 2 day(s) available',
      );
    });

    it('should notify manager when employee has managerId', async () => {
      const employee = makeEmployee({ managerId: 'mgr-1' });
      const policy = makePolicy();
      const balance = makeBalance();
      const leaveRequest = makeLeaveRequest();

      mockEmployeeRepo.findById.mockResolvedValue(employee);
      mockPolicyRepo.findById.mockResolvedValue(policy);
      mockBalanceRepo.findByEmployeeAndPolicy.mockResolvedValue(balance);
      mockGetHolidaysForYear.mockResolvedValue([]);
      mockCalculateBusinessDays.mockReturnValue(3);
      mockBalanceRepo.incrementUsedDays.mockResolvedValue(balance);
      mockLeaveRepo.create.mockResolvedValue(leaveRequest);
      mockAuditRepo.create.mockResolvedValue({});
      mockNotificationRepo.create.mockResolvedValue({});

      await service.submitLeaveRequest(dto);

      expect(mockNotificationRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientId: 'mgr-1',
          type: 'leave_submitted',
          relatedEntityType: 'leave_request',
          relatedEntityId: 'lr-1',
          status: 'PENDING',
        }),
      );
    });

    it('should notify HR admins when employee has no manager', async () => {
      const employee = makeEmployee({ managerId: null });
      const policy = makePolicy();
      const balance = makeBalance();
      const leaveRequest = makeLeaveRequest();
      const hrAdmin1 = makeEmployee({ id: 'hr-1', role: 'hr_admin', managerId: null });
      const hrAdmin2 = makeEmployee({ id: 'hr-2', role: 'hr_admin', managerId: null });

      mockEmployeeRepo.findById.mockResolvedValue(employee);
      mockEmployeeRepo.findAll.mockResolvedValue([
        employee,
        hrAdmin1,
        hrAdmin2,
        makeEmployee({ id: 'emp-2', role: 'employee' }),
      ]);
      mockPolicyRepo.findById.mockResolvedValue(policy);
      mockBalanceRepo.findByEmployeeAndPolicy.mockResolvedValue(balance);
      mockGetHolidaysForYear.mockResolvedValue([]);
      mockCalculateBusinessDays.mockReturnValue(3);
      mockBalanceRepo.incrementUsedDays.mockResolvedValue(balance);
      mockLeaveRepo.create.mockResolvedValue(leaveRequest);
      mockAuditRepo.create.mockResolvedValue({});
      mockNotificationRepo.create.mockResolvedValue({});

      await service.submitLeaveRequest(dto);

      expect(mockNotificationRepo.create).toHaveBeenCalledTimes(2);
      expect(mockNotificationRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ recipientId: 'hr-1' }),
      );
      expect(mockNotificationRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ recipientId: 'hr-2' }),
      );
    });

    it('should create audit log with action CREATE', async () => {
      const employee = makeEmployee();
      const policy = makePolicy();
      const balance = makeBalance();
      const leaveRequest = makeLeaveRequest();

      mockEmployeeRepo.findById.mockResolvedValue(employee);
      mockPolicyRepo.findById.mockResolvedValue(policy);
      mockBalanceRepo.findByEmployeeAndPolicy.mockResolvedValue(balance);
      mockGetHolidaysForYear.mockResolvedValue([]);
      mockCalculateBusinessDays.mockReturnValue(3);
      mockBalanceRepo.incrementUsedDays.mockResolvedValue(balance);
      mockLeaveRepo.create.mockResolvedValue(leaveRequest);
      mockAuditRepo.create.mockResolvedValue({});
      mockNotificationRepo.create.mockResolvedValue({});

      await service.submitLeaveRequest(dto);

      expect(mockAuditRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'leave_request',
          entityId: 'lr-1',
          action: AuditAction.CREATE,
          performedBy: 'emp-1',
        }),
      );
    });

    it('should return created LeaveRequest with status SUBMITTED', async () => {
      const employee = makeEmployee();
      const policy = makePolicy();
      const balance = makeBalance();
      const leaveRequest = makeLeaveRequest({ status: LeaveRequestStatus.SUBMITTED });

      mockEmployeeRepo.findById.mockResolvedValue(employee);
      mockPolicyRepo.findById.mockResolvedValue(policy);
      mockBalanceRepo.findByEmployeeAndPolicy.mockResolvedValue(balance);
      mockGetHolidaysForYear.mockResolvedValue([]);
      mockCalculateBusinessDays.mockReturnValue(3);
      mockBalanceRepo.incrementUsedDays.mockResolvedValue(balance);
      mockLeaveRepo.create.mockResolvedValue(leaveRequest);
      mockAuditRepo.create.mockResolvedValue({});
      mockNotificationRepo.create.mockResolvedValue({});

      const result = await service.submitLeaveRequest(dto);

      expect(result.status).toBe(LeaveRequestStatus.SUBMITTED);
      expect(result.employeeId).toBe('emp-1');
      expect(result.policyId).toBe('pol-1');
    });
  });

  // ── approveLeaveRequest ─────────────────────────────────────────

  describe('approveLeaveRequest', () => {
    it('should throw if request not found', async () => {
      mockLeaveRepo.findById.mockResolvedValue(null);

      await expect(
        service.approveLeaveRequest('lr-1', 'mgr-1'),
      ).rejects.toThrow('Leave request not found: lr-1');
    });

    it('should throw if request status is not SUBMITTED', async () => {
      mockLeaveRepo.findById.mockResolvedValue(
        makeLeaveRequest({ status: LeaveRequestStatus.APPROVED }),
      );

      await expect(
        service.approveLeaveRequest('lr-1', 'mgr-1'),
      ).rejects.toThrow('Cannot approve request with status: APPROVED');
    });

    it('should update status to APPROVED and set approver fields', async () => {
      const request = makeLeaveRequest({ status: LeaveRequestStatus.SUBMITTED });
      const approved = makeLeaveRequest({
        status: LeaveRequestStatus.APPROVED,
        approvedBy: 'mgr-1',
        approvedAt: new Date('2026-06-16T10:00:00.000Z'),
      });

      mockLeaveRepo.findById.mockResolvedValue(request);
      mockLeaveRepo.updateStatus.mockResolvedValue(approved);
      mockAuditRepo.create.mockResolvedValue({});
      mockNotificationRepo.create.mockResolvedValue({});

      const result = await service.approveLeaveRequest('lr-1', 'mgr-1');

      expect(mockLeaveRepo.updateStatus).toHaveBeenCalledWith(
        'lr-1',
        LeaveRequestStatus.APPROVED,
        'mgr-1',
        null,
      );
      expect(result.status).toBe(LeaveRequestStatus.APPROVED);
      expect(result.approvedBy).toBe('mgr-1');
    });

    it('should create audit log with action APPROVE', async () => {
      const request = makeLeaveRequest({ status: LeaveRequestStatus.SUBMITTED });
      const approved = makeLeaveRequest({
        status: LeaveRequestStatus.APPROVED,
        approvedBy: 'mgr-1',
        approvedAt: new Date('2026-06-16T10:00:00.000Z'),
      });

      mockLeaveRepo.findById.mockResolvedValue(request);
      mockLeaveRepo.updateStatus.mockResolvedValue(approved);
      mockAuditRepo.create.mockResolvedValue({});
      mockNotificationRepo.create.mockResolvedValue({});

      await service.approveLeaveRequest('lr-1', 'mgr-1');

      expect(mockAuditRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'leave_request',
          entityId: 'lr-1',
          action: AuditAction.APPROVE,
          performedBy: 'mgr-1',
        }),
      );
    });

    it('should notify the employee', async () => {
      const request = makeLeaveRequest({ status: LeaveRequestStatus.SUBMITTED });
      const approved = makeLeaveRequest({
        status: LeaveRequestStatus.APPROVED,
        approvedBy: 'mgr-1',
        approvedAt: new Date('2026-06-16T10:00:00.000Z'),
      });

      mockLeaveRepo.findById.mockResolvedValue(request);
      mockLeaveRepo.updateStatus.mockResolvedValue(approved);
      mockAuditRepo.create.mockResolvedValue({});
      mockNotificationRepo.create.mockResolvedValue({});

      await service.approveLeaveRequest('lr-1', 'mgr-1');

      expect(mockNotificationRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientId: 'emp-1',
          type: 'leave_approved',
          relatedEntityType: 'leave_request',
          relatedEntityId: 'lr-1',
          status: 'PENDING',
        }),
      );
    });

    it('should NOT modify usedDays', async () => {
      const request = makeLeaveRequest({ status: LeaveRequestStatus.SUBMITTED });
      const approved = makeLeaveRequest({
        status: LeaveRequestStatus.APPROVED,
        approvedBy: 'mgr-1',
        approvedAt: new Date('2026-06-16T10:00:00.000Z'),
      });

      mockLeaveRepo.findById.mockResolvedValue(request);
      mockLeaveRepo.updateStatus.mockResolvedValue(approved);
      mockAuditRepo.create.mockResolvedValue({});
      mockNotificationRepo.create.mockResolvedValue({});

      await service.approveLeaveRequest('lr-1', 'mgr-1');

      expect(mockBalanceRepo.incrementUsedDays).not.toHaveBeenCalled();
      expect(mockBalanceRepo.decrementUsedDays).not.toHaveBeenCalled();
    });
  });

  // ── rejectLeaveRequest ──────────────────────────────────────────

  describe('rejectLeaveRequest', () => {
    it('should throw if request not found', async () => {
      mockLeaveRepo.findById.mockResolvedValue(null);

      await expect(
        service.rejectLeaveRequest('lr-1', 'mgr-1', 'Not enough coverage'),
      ).rejects.toThrow('Leave request not found: lr-1');
    });

    it('should throw if request status is not SUBMITTED', async () => {
      mockLeaveRepo.findById.mockResolvedValue(
        makeLeaveRequest({ status: LeaveRequestStatus.APPROVED }),
      );

      await expect(
        service.rejectLeaveRequest('lr-1', 'mgr-1', 'reason'),
      ).rejects.toThrow('Cannot reject request with status: APPROVED');
    });

    it('should update status to REJECTED with rejectionReason', async () => {
      const request = makeLeaveRequest({ status: LeaveRequestStatus.SUBMITTED });
      const rejected = makeLeaveRequest({
        status: LeaveRequestStatus.REJECTED,
        rejectionReason: 'Not enough coverage',
      });

      mockLeaveRepo.findById.mockResolvedValue(request);
      mockLeaveRepo.updateStatus.mockResolvedValue(rejected);
      mockGetHolidaysForYear.mockResolvedValue([]);
      mockCalculateBusinessDays.mockReturnValue(3);
      mockBalanceRepo.findByEmployeeAndPolicy.mockResolvedValue(makeBalance());
      mockBalanceRepo.decrementUsedDays.mockResolvedValue(makeBalance());
      mockAuditRepo.create.mockResolvedValue({});
      mockNotificationRepo.create.mockResolvedValue({});

      const result = await service.rejectLeaveRequest(
        'lr-1',
        'mgr-1',
        'Not enough coverage',
      );

      expect(mockLeaveRepo.updateStatus).toHaveBeenCalledWith(
        'lr-1',
        LeaveRequestStatus.REJECTED,
        null,
        'Not enough coverage',
      );
      expect(result.status).toBe(LeaveRequestStatus.REJECTED);
      expect(result.rejectionReason).toBe('Not enough coverage');
    });

    it('should restore balance via decrementUsedDays', async () => {
      const request = makeLeaveRequest({ status: LeaveRequestStatus.SUBMITTED });
      const rejected = makeLeaveRequest({
        status: LeaveRequestStatus.REJECTED,
        rejectionReason: 'reason',
      });
      const balance = makeBalance();

      mockLeaveRepo.findById.mockResolvedValue(request);
      mockLeaveRepo.updateStatus.mockResolvedValue(rejected);
      mockGetHolidaysForYear.mockResolvedValue([]);
      mockCalculateBusinessDays.mockReturnValue(3);
      mockBalanceRepo.findByEmployeeAndPolicy.mockResolvedValue(balance);
      mockBalanceRepo.decrementUsedDays.mockResolvedValue(balance);
      mockAuditRepo.create.mockResolvedValue({});
      mockNotificationRepo.create.mockResolvedValue({});

      await service.rejectLeaveRequest('lr-1', 'mgr-1', 'reason');

      expect(mockBalanceRepo.decrementUsedDays).toHaveBeenCalledWith('bal-1', 3);
    });

    it('should create audit log with action REJECT', async () => {
      const request = makeLeaveRequest({ status: LeaveRequestStatus.SUBMITTED });
      const rejected = makeLeaveRequest({
        status: LeaveRequestStatus.REJECTED,
        rejectionReason: 'reason',
      });

      mockLeaveRepo.findById.mockResolvedValue(request);
      mockLeaveRepo.updateStatus.mockResolvedValue(rejected);
      mockGetHolidaysForYear.mockResolvedValue([]);
      mockCalculateBusinessDays.mockReturnValue(3);
      mockBalanceRepo.findByEmployeeAndPolicy.mockResolvedValue(makeBalance());
      mockBalanceRepo.decrementUsedDays.mockResolvedValue(makeBalance());
      mockAuditRepo.create.mockResolvedValue({});
      mockNotificationRepo.create.mockResolvedValue({});

      await service.rejectLeaveRequest('lr-1', 'mgr-1', 'reason');

      expect(mockAuditRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'leave_request',
          entityId: 'lr-1',
          action: AuditAction.REJECT,
          performedBy: 'mgr-1',
        }),
      );
    });

    it('should notify the employee', async () => {
      const request = makeLeaveRequest({ status: LeaveRequestStatus.SUBMITTED });
      const rejected = makeLeaveRequest({
        status: LeaveRequestStatus.REJECTED,
        rejectionReason: 'reason',
      });

      mockLeaveRepo.findById.mockResolvedValue(request);
      mockLeaveRepo.updateStatus.mockResolvedValue(rejected);
      mockGetHolidaysForYear.mockResolvedValue([]);
      mockCalculateBusinessDays.mockReturnValue(3);
      mockBalanceRepo.findByEmployeeAndPolicy.mockResolvedValue(makeBalance());
      mockBalanceRepo.decrementUsedDays.mockResolvedValue(makeBalance());
      mockAuditRepo.create.mockResolvedValue({});
      mockNotificationRepo.create.mockResolvedValue({});

      await service.rejectLeaveRequest('lr-1', 'mgr-1', 'reason');

      expect(mockNotificationRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientId: 'emp-1',
          type: 'leave_rejected',
          relatedEntityType: 'leave_request',
          relatedEntityId: 'lr-1',
          status: 'PENDING',
        }),
      );
    });
  });

  // ── cancelLeaveRequest ──────────────────────────────────────────

  describe('cancelLeaveRequest', () => {
    it('should throw if request not found', async () => {
      mockLeaveRepo.findById.mockResolvedValue(null);

      await expect(
        service.cancelLeaveRequest('lr-1', 'emp-1'),
      ).rejects.toThrow('Leave request not found: lr-1');
    });

    it('should throw if status is not SUBMITTED or APPROVED', async () => {
      mockLeaveRepo.findById.mockResolvedValue(
        makeLeaveRequest({ status: LeaveRequestStatus.REJECTED }),
      );

      await expect(
        service.cancelLeaveRequest('lr-1', 'emp-1'),
      ).rejects.toThrow('Cannot cancel request with status: REJECTED');
    });

    it('should throw if employeeId does not match', async () => {
      mockLeaveRepo.findById.mockResolvedValue(
        makeLeaveRequest({ status: LeaveRequestStatus.SUBMITTED, employeeId: 'emp-2' }),
      );

      await expect(
        service.cancelLeaveRequest('lr-1', 'emp-1'),
      ).rejects.toThrow('Employee mismatch: request belongs to emp-2, not emp-1');
    });

    it('should cancel a SUBMITTED request', async () => {
      const request = makeLeaveRequest({ status: LeaveRequestStatus.SUBMITTED });
      const cancelled = makeLeaveRequest({ status: LeaveRequestStatus.CANCELLED });

      mockLeaveRepo.findById.mockResolvedValue(request);
      mockLeaveRepo.updateStatus.mockResolvedValue(cancelled);
      mockGetHolidaysForYear.mockResolvedValue([]);
      mockCalculateBusinessDays.mockReturnValue(3);
      mockBalanceRepo.findByEmployeeAndPolicy.mockResolvedValue(makeBalance());
      mockBalanceRepo.decrementUsedDays.mockResolvedValue(makeBalance());
      mockAuditRepo.create.mockResolvedValue({});

      const result = await service.cancelLeaveRequest('lr-1', 'emp-1');

      expect(result.status).toBe(LeaveRequestStatus.CANCELLED);
    });

    it('should cancel an APPROVED request', async () => {
      const request = makeLeaveRequest({ status: LeaveRequestStatus.APPROVED });
      const cancelled = makeLeaveRequest({ status: LeaveRequestStatus.CANCELLED });

      mockLeaveRepo.findById.mockResolvedValue(request);
      mockLeaveRepo.updateStatus.mockResolvedValue(cancelled);
      mockGetHolidaysForYear.mockResolvedValue([]);
      mockCalculateBusinessDays.mockReturnValue(3);
      mockBalanceRepo.findByEmployeeAndPolicy.mockResolvedValue(makeBalance());
      mockBalanceRepo.decrementUsedDays.mockResolvedValue(makeBalance());
      mockAuditRepo.create.mockResolvedValue({});

      const result = await service.cancelLeaveRequest('lr-1', 'emp-1');

      expect(result.status).toBe(LeaveRequestStatus.CANCELLED);
    });

    it('should restore balance via decrementUsedDays', async () => {
      const request = makeLeaveRequest({ status: LeaveRequestStatus.SUBMITTED });
      const cancelled = makeLeaveRequest({ status: LeaveRequestStatus.CANCELLED });
      const balance = makeBalance();

      mockLeaveRepo.findById.mockResolvedValue(request);
      mockLeaveRepo.updateStatus.mockResolvedValue(cancelled);
      mockGetHolidaysForYear.mockResolvedValue([]);
      mockCalculateBusinessDays.mockReturnValue(3);
      mockBalanceRepo.findByEmployeeAndPolicy.mockResolvedValue(balance);
      mockBalanceRepo.decrementUsedDays.mockResolvedValue(balance);
      mockAuditRepo.create.mockResolvedValue({});

      await service.cancelLeaveRequest('lr-1', 'emp-1');

      expect(mockBalanceRepo.decrementUsedDays).toHaveBeenCalledWith('bal-1', 3);
    });

    it('should create audit log with action UPDATE', async () => {
      const request = makeLeaveRequest({ status: LeaveRequestStatus.SUBMITTED });
      const cancelled = makeLeaveRequest({ status: LeaveRequestStatus.CANCELLED });

      mockLeaveRepo.findById.mockResolvedValue(request);
      mockLeaveRepo.updateStatus.mockResolvedValue(cancelled);
      mockGetHolidaysForYear.mockResolvedValue([]);
      mockCalculateBusinessDays.mockReturnValue(3);
      mockBalanceRepo.findByEmployeeAndPolicy.mockResolvedValue(makeBalance());
      mockBalanceRepo.decrementUsedDays.mockResolvedValue(makeBalance());
      mockAuditRepo.create.mockResolvedValue({});

      await service.cancelLeaveRequest('lr-1', 'emp-1');

      expect(mockAuditRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'leave_request',
          entityId: 'lr-1',
          action: AuditAction.UPDATE,
          performedBy: 'emp-1',
        }),
      );
    });

    it('should NOT create a notification on cancel', async () => {
      const request = makeLeaveRequest({ status: LeaveRequestStatus.SUBMITTED });
      const cancelled = makeLeaveRequest({ status: LeaveRequestStatus.CANCELLED });

      mockLeaveRepo.findById.mockResolvedValue(request);
      mockLeaveRepo.updateStatus.mockResolvedValue(cancelled);
      mockGetHolidaysForYear.mockResolvedValue([]);
      mockCalculateBusinessDays.mockReturnValue(3);
      mockBalanceRepo.findByEmployeeAndPolicy.mockResolvedValue(makeBalance());
      mockBalanceRepo.decrementUsedDays.mockResolvedValue(makeBalance());
      mockAuditRepo.create.mockResolvedValue({});

      await service.cancelLeaveRequest('lr-1', 'emp-1');

      expect(mockNotificationRepo.create).not.toHaveBeenCalled();
    });
  });

  // ── getLeaveRequest ─────────────────────────────────────────────

  describe('getLeaveRequest', () => {
    it('should return LeaveRequest when found', async () => {
      const request = makeLeaveRequest();
      mockLeaveRepo.findById.mockResolvedValue(request);

      const result = await service.getLeaveRequest('lr-1');

      expect(result).toBe(request);
    });

    it('should return null when not found', async () => {
      mockLeaveRepo.findById.mockResolvedValue(null);

      const result = await service.getLeaveRequest('lr-1');

      expect(result).toBeNull();
    });

    it('should not create audit or notification', async () => {
      mockLeaveRepo.findById.mockResolvedValue(makeLeaveRequest());

      await service.getLeaveRequest('lr-1');

      expect(mockAuditRepo.create).not.toHaveBeenCalled();
      expect(mockNotificationRepo.create).not.toHaveBeenCalled();
    });
  });

  // ── getEmployeeLeaveRequests ────────────────────────────────────

  describe('getEmployeeLeaveRequests', () => {
    it('should return array of LeaveRequests', async () => {
      const requests = [makeLeaveRequest(), makeLeaveRequest({ id: 'lr-2' })];
      mockLeaveRepo.findByEmployeeId.mockResolvedValue(requests);

      const result = await service.getEmployeeLeaveRequests('emp-1');

      expect(result).toHaveLength(2);
      expect(result).toBe(requests);
    });

    it('should return empty array when none exist', async () => {
      mockLeaveRepo.findByEmployeeId.mockResolvedValue([]);

      const result = await service.getEmployeeLeaveRequests('emp-1');

      expect(result).toEqual([]);
    });

    it('should pass query params to repository', async () => {
      mockLeaveRepo.findByEmployeeId.mockResolvedValue([]);
      const params = { status: LeaveRequestStatus.APPROVED, limit: 10 };

      await service.getEmployeeLeaveRequests('emp-1', params);

      expect(mockLeaveRepo.findByEmployeeId).toHaveBeenCalledWith('emp-1', params);
    });

    it('should not create audit or notification', async () => {
      mockLeaveRepo.findByEmployeeId.mockResolvedValue([]);

      await service.getEmployeeLeaveRequests('emp-1');

      expect(mockAuditRepo.create).not.toHaveBeenCalled();
      expect(mockNotificationRepo.create).not.toHaveBeenCalled();
    });
  });
});
