import {
  LeaveRequestService,
  LeaveRequestNotFoundError,
  InvalidStatusTransitionError,
  EmployeeNotFoundError,
  PolicyNotFoundError,
  PolicyInactiveError,
  BalanceNotFoundError,
  InsufficientBalanceError,
  ApproverNotAuthorizedError,
  InvalidRejectionReasonError,
} from '../../../../src/modules/leave/leave.service';
import type { ILeaveRequestRepository } from '../../../../src/modules/leave/leave.repository';
import type { IEmployeeRepository } from '../../../../src/modules/employee/employee.repository';
import type { ILeavePolicyRepository } from '../../../../src/modules/policy/policy.repository';
import type { ILeaveBalanceRepository } from '../../../../src/modules/balance/balance.repository';
import type { IHolidayRepository } from '../../../../src/shared/holidays/holiday.repository';
import type { INotificationService } from '../../../../src/modules/notification/notification.service.interface';
import type { IAuditLogRepository } from '../../../../src/modules/audit/audit.repository';
import type { LeaveRequest } from '../../../../src/modules/leave/leave.model';
import type { Employee } from '../../../../src/modules/employee/employee.model';
import type { LeavePolicy } from '../../../../src/modules/policy/policy.model';
import type { LeaveBalanceWithRemaining } from '../../../../src/modules/balance/balance.model';
import type { Holiday } from '../../../../src/shared/holidays/holiday.model';
import type { CreateLeaveRequestDto } from '../../../../src/shared/types/leave-request.dto';
import { LeaveRequestStatus, LeaveType } from '../../../../src/shared/types/enums';

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
    employmentStatus: 'ACTIVE',
    createdAt: new Date('2020-01-15'),
    updatedAt: new Date('2020-01-15'),
    ...overrides,
  };
}

function makePolicy(overrides: Partial<LeavePolicy> = {}): LeavePolicy {
  return {
    id: 'pol-001',
    policyName: 'Annual Leave',
    leaveType: LeaveType.ANNUAL,
    entitlementDays: 20,
    accrualRate: null,
    maxAccumulation: null,
    minimumNoticeDays: null,
    requiresManagerApproval: true,
    isActive: true,
    createdAt: new Date('2020-01-01'),
    updatedAt: new Date('2020-01-01'),
    ...overrides,
  };
}

function makeBalance(overrides: Partial<LeaveBalanceWithRemaining> = {}): LeaveBalanceWithRemaining {
  return {
    id: 'bal-001',
    employeeId: 'emp-001',
    leavePolicyId: 'pol-001',
    totalEntitlement: 20,
    usedDays: 5,
    remainingDays: 15,
    fiscalYear: 2026,
    status: 'ACTIVE',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

function makeLeaveRequest(overrides: Partial<LeaveRequest> = {}): LeaveRequest {
  return {
    id: 'lr-001',
    employeeId: 'emp-001',
    leavePolicyId: 'pol-001',
    startDate: new Date('2026-07-06'),
    endDate: new Date('2026-07-10'),
    reason: 'Vacation',
    status: LeaveRequestStatus.DRAFT,
    approvedBy: null,
    approvedAt: null,
    rejectedBy: null,
    rejectedAt: null,
    rejectionReason: null,
    cancelledBy: null,
    cancelledAt: null,
    createdAt: new Date('2026-06-15'),
    updatedAt: new Date('2026-06-15'),
    ...overrides,
  };
}

function makeHoliday(overrides: Partial<Holiday> = {}): Holiday {
  return {
    id: 'hol-001',
    date: new Date('2026-07-04'),
    name: 'Independence Day',
    country: 'US',
    ...overrides,
  };
}

describe('LeaveRequestService', () => {
  let service: LeaveRequestService;
  let leaveRequestRepo: jest.Mocked<ILeaveRequestRepository>;
  let employeeRepo: jest.Mocked<IEmployeeRepository>;
  let policyRepo: jest.Mocked<ILeavePolicyRepository>;
  let balanceRepo: jest.Mocked<ILeaveBalanceRepository>;
  let holidayRepo: jest.Mocked<IHolidayRepository>;
  let notificationService: jest.Mocked<INotificationService>;
  let auditRepo: jest.Mocked<IAuditLogRepository>;

  beforeEach(() => {
    leaveRequestRepo = {
      findById: jest.fn(),
      findByEmployeeId: jest.fn(),
      findByStatus: jest.fn(),
      findByEmployeeAndDateRange: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    } as jest.Mocked<ILeaveRequestRepository>;

    employeeRepo = {
      findById: jest.fn(),
      findByEmployeeNumber: jest.fn(),
      findByEmail: jest.fn(),
      findByManagerId: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    } as jest.Mocked<IEmployeeRepository>;

    policyRepo = {
      findById: jest.fn(),
      findByLeaveType: jest.fn(),
      findActive: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    } as jest.Mocked<ILeavePolicyRepository>;

    balanceRepo = {
      findByEmployeeAndPolicy: jest.fn(),
      findByEmployeeId: jest.fn(),
      create: jest.fn(),
      updateUsedDays: jest.fn(),
    } as jest.Mocked<ILeaveBalanceRepository>;

    holidayRepo = {
      findByDateRange: jest.fn(),
      findByYear: jest.fn(),
    } as jest.Mocked<IHolidayRepository>;

    notificationService = {
      notifyLeaveSubmitted: jest.fn(),
      notifyLeaveStatusChange: jest.fn(),
    } as jest.Mocked<INotificationService>;

    auditRepo = {
      create: jest.fn(),
      findByTarget: jest.fn(),
      findByActor: jest.fn(),
    } as jest.Mocked<IAuditLogRepository>;

    service = new LeaveRequestService(
      leaveRequestRepo,
      employeeRepo,
      policyRepo,
      balanceRepo,
      holidayRepo,
      notificationService,
      auditRepo,
    );
  });

  describe('submitDraft', () => {
    it('should submit with sufficient balance', async () => {
      const draft = makeLeaveRequest({ status: LeaveRequestStatus.DRAFT });
      const employee = makeEmployee();
      const policy = makePolicy();
      const balance = makeBalance({ usedDays: 5, remainingDays: 15 });
      const holidays: Holiday[] = [];

      leaveRequestRepo.findById.mockResolvedValue(draft);
      employeeRepo.findById.mockResolvedValue(employee);
      policyRepo.findById.mockResolvedValue(policy);
      holidayRepo.findByDateRange.mockResolvedValue(holidays);
      balanceRepo.findByEmployeeAndPolicy.mockResolvedValue(balance);
      balanceRepo.updateUsedDays.mockResolvedValue({ ...balance, usedDays: 10, remainingDays: 10 });
      leaveRequestRepo.update.mockResolvedValue({
        ...draft,
        status: LeaveRequestStatus.SUBMITTED,
      });
      auditRepo.create.mockResolvedValue({
        id: 'audit-001',
        actorId: 'emp-001',
        action: 'LEAVE_SUBMITTED',
        targetId: 'lr-001',
        targetType: 'LeaveRequest',
        details: {},
        timestamp: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.submitDraft('lr-001', 'emp-001');

      expect(result.status).toBe(LeaveRequestStatus.SUBMITTED);
      expect(balanceRepo.updateUsedDays).toHaveBeenCalledWith('bal-001', 10);
      expect(auditRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'emp-001',
          action: 'LEAVE_SUBMITTED',
          targetId: 'lr-001',
          targetType: 'LeaveRequest',
        }),
      );
      expect(notificationService.notifyLeaveSubmitted).toHaveBeenCalledWith('emp-001', 'lr-001');
    });

    it('should fail with insufficient balance', async () => {
      const draft = makeLeaveRequest({ status: LeaveRequestStatus.DRAFT });
      const employee = makeEmployee();
      const policy = makePolicy();
      const balance = makeBalance({ usedDays: 18, remainingDays: 2 });
      const holidays: Holiday[] = [];

      leaveRequestRepo.findById.mockResolvedValue(draft);
      employeeRepo.findById.mockResolvedValue(employee);
      policyRepo.findById.mockResolvedValue(policy);
      holidayRepo.findByDateRange.mockResolvedValue(holidays);
      balanceRepo.findByEmployeeAndPolicy.mockResolvedValue(balance);

      await expect(service.submitDraft('lr-001', 'emp-001')).rejects.toThrow(InsufficientBalanceError);
      expect(balanceRepo.updateUsedDays).not.toHaveBeenCalled();
    });

    it('should fail when leave request not found', async () => {
      leaveRequestRepo.findById.mockResolvedValue(null);

      await expect(service.submitDraft('nonexistent', 'emp-001')).rejects.toThrow(LeaveRequestNotFoundError);
    });

    it('should fail when status is not DRAFT', async () => {
      const submitted = makeLeaveRequest({ status: LeaveRequestStatus.SUBMITTED });
      leaveRequestRepo.findById.mockResolvedValue(submitted);

      await expect(service.submitDraft('lr-001', 'emp-001')).rejects.toThrow(InvalidStatusTransitionError);
    });

    it('should fail when employee not found', async () => {
      const draft = makeLeaveRequest({ status: LeaveRequestStatus.DRAFT });
      leaveRequestRepo.findById.mockResolvedValue(draft);
      employeeRepo.findById.mockResolvedValue(null);

      await expect(service.submitDraft('lr-001', 'emp-001')).rejects.toThrow(EmployeeNotFoundError);
    });

    it('should fail when policy not found', async () => {
      const draft = makeLeaveRequest({ status: LeaveRequestStatus.DRAFT });
      const employee = makeEmployee();
      leaveRequestRepo.findById.mockResolvedValue(draft);
      employeeRepo.findById.mockResolvedValue(employee);
      policyRepo.findById.mockResolvedValue(null);

      await expect(service.submitDraft('lr-001', 'emp-001')).rejects.toThrow(PolicyNotFoundError);
    });

    it('should fail when policy is inactive', async () => {
      const draft = makeLeaveRequest({ status: LeaveRequestStatus.DRAFT });
      const employee = makeEmployee();
      const policy = makePolicy({ isActive: false });
      leaveRequestRepo.findById.mockResolvedValue(draft);
      employeeRepo.findById.mockResolvedValue(employee);
      policyRepo.findById.mockResolvedValue(policy);

      await expect(service.submitDraft('lr-001', 'emp-001')).rejects.toThrow(PolicyInactiveError);
    });

    it('should fail when balance not found', async () => {
      const draft = makeLeaveRequest({ status: LeaveRequestStatus.DRAFT });
      const employee = makeEmployee();
      const policy = makePolicy();
      const holidays: Holiday[] = [];
      leaveRequestRepo.findById.mockResolvedValue(draft);
      employeeRepo.findById.mockResolvedValue(employee);
      policyRepo.findById.mockResolvedValue(policy);
      holidayRepo.findByDateRange.mockResolvedValue(holidays);
      balanceRepo.findByEmployeeAndPolicy.mockResolvedValue(null);

      await expect(service.submitDraft('lr-001', 'emp-001')).rejects.toThrow(BalanceNotFoundError);
    });

    it('should derive fiscal year from startDate calendar year', async () => {
      const draft = makeLeaveRequest({
        status: LeaveRequestStatus.DRAFT,
        startDate: new Date('2026-03-15'),
        endDate: new Date('2026-03-20'),
      });
      const employee = makeEmployee();
      const policy = makePolicy();
      const balance = makeBalance({ fiscalYear: 2026, usedDays: 0, remainingDays: 20 });
      const holidays: Holiday[] = [];

      leaveRequestRepo.findById.mockResolvedValue(draft);
      employeeRepo.findById.mockResolvedValue(employee);
      policyRepo.findById.mockResolvedValue(policy);
      holidayRepo.findByDateRange.mockResolvedValue(holidays);
      balanceRepo.findByEmployeeAndPolicy.mockResolvedValue(balance);
      balanceRepo.updateUsedDays.mockResolvedValue({ ...balance, usedDays: 5, remainingDays: 15 });
      leaveRequestRepo.update.mockResolvedValue({
        ...draft,
        status: LeaveRequestStatus.SUBMITTED,
      });

      await service.submitDraft('lr-001', 'emp-001');

      expect(balanceRepo.findByEmployeeAndPolicy).toHaveBeenCalledWith('emp-001', 'pol-001', 2026);
    });

    it('should count business days excluding weekends and holidays', async () => {
      const draft = makeLeaveRequest({
        status: LeaveRequestStatus.DRAFT,
        startDate: new Date('2026-07-06'),
        endDate: new Date('2026-07-10'),
      });
      const employee = makeEmployee();
      const policy = makePolicy();
      const balance = makeBalance({ usedDays: 0, remainingDays: 20 });
      const holidays: Holiday[] = [];

      leaveRequestRepo.findById.mockResolvedValue(draft);
      employeeRepo.findById.mockResolvedValue(employee);
      policyRepo.findById.mockResolvedValue(policy);
      holidayRepo.findByDateRange.mockResolvedValue(holidays);
      balanceRepo.findByEmployeeAndPolicy.mockResolvedValue(balance);
      balanceRepo.updateUsedDays.mockResolvedValue({ ...balance, usedDays: 5, remainingDays: 15 });
      leaveRequestRepo.update.mockResolvedValue({
        ...draft,
        status: LeaveRequestStatus.SUBMITTED,
      });

      await service.submitDraft('lr-001', 'emp-001');

      expect(balanceRepo.updateUsedDays).toHaveBeenCalledWith('bal-001', 5);
    });

    it('should count business days with holidays excluded', async () => {
      const draft = makeLeaveRequest({
        status: LeaveRequestStatus.DRAFT,
        startDate: new Date('2026-07-06'),
        endDate: new Date('2026-07-10'),
      });
      const employee = makeEmployee();
      const policy = makePolicy();
      const balance = makeBalance({ usedDays: 0, remainingDays: 20 });
      const holidays: Holiday[] = [makeHoliday({ date: new Date('2026-07-08') })];

      leaveRequestRepo.findById.mockResolvedValue(draft);
      employeeRepo.findById.mockResolvedValue(employee);
      policyRepo.findById.mockResolvedValue(policy);
      holidayRepo.findByDateRange.mockResolvedValue(holidays);
      balanceRepo.findByEmployeeAndPolicy.mockResolvedValue(balance);
      balanceRepo.updateUsedDays.mockResolvedValue({ ...balance, usedDays: 4, remainingDays: 16 });
      leaveRequestRepo.update.mockResolvedValue({
        ...draft,
        status: LeaveRequestStatus.SUBMITTED,
      });

      await service.submitDraft('lr-001', 'emp-001');

      expect(balanceRepo.updateUsedDays).toHaveBeenCalledWith('bal-001', 4);
    });
  });

  describe('approve', () => {
    it('should approve by manager', async () => {
      const leaveRequest = makeLeaveRequest({ status: LeaveRequestStatus.SUBMITTED });
      const employee = makeEmployee({ managerId: 'mgr-001' });

      leaveRequestRepo.findById.mockResolvedValue(leaveRequest);
      employeeRepo.findById.mockResolvedValue(employee);
      leaveRequestRepo.update.mockResolvedValue({
        ...leaveRequest,
        status: LeaveRequestStatus.APPROVED,
        approvedBy: 'mgr-001',
        approvedAt: expect.any(Date) as Date,
      });

      const result = await service.approve('lr-001', 'mgr-001', 'manager');

      expect(result.status).toBe(LeaveRequestStatus.APPROVED);
      expect(result.approvedBy).toBe('mgr-001');
      expect(auditRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'mgr-001',
          action: 'LEAVE_APPROVED',
          targetId: 'lr-001',
        }),
      );
      expect(notificationService.notifyLeaveStatusChange).toHaveBeenCalledWith(
        'emp-001',
        'lr-001',
        LeaveRequestStatus.SUBMITTED,
        LeaveRequestStatus.APPROVED,
      );
      expect(balanceRepo.updateUsedDays).not.toHaveBeenCalled();
    });

    it('should approve by HR admin for employee with no manager', async () => {
      const leaveRequest = makeLeaveRequest({ status: LeaveRequestStatus.SUBMITTED });
      const employee = makeEmployee({ managerId: null });

      leaveRequestRepo.findById.mockResolvedValue(leaveRequest);
      employeeRepo.findById.mockResolvedValue(employee);
      leaveRequestRepo.update.mockResolvedValue({
        ...leaveRequest,
        status: LeaveRequestStatus.APPROVED,
        approvedBy: 'hr-001',
        approvedAt: expect.any(Date) as Date,
      });

      const result = await service.approve('lr-001', 'hr-001', 'hr_admin');

      expect(result.status).toBe(LeaveRequestStatus.APPROVED);
      expect(result.approvedBy).toBe('hr-001');
    });

    it('should reject employee role from approving', async () => {
      const leaveRequest = makeLeaveRequest({ status: LeaveRequestStatus.SUBMITTED });
      const employee = makeEmployee();

      leaveRequestRepo.findById.mockResolvedValue(leaveRequest);
      employeeRepo.findById.mockResolvedValue(employee);

      await expect(service.approve('lr-001', 'emp-002', 'employee')).rejects.toThrow(ApproverNotAuthorizedError);
    });

    it('should reject manager who is not the assigned manager', async () => {
      const leaveRequest = makeLeaveRequest({ status: LeaveRequestStatus.SUBMITTED });
      const employee = makeEmployee({ managerId: 'mgr-001' });

      leaveRequestRepo.findById.mockResolvedValue(leaveRequest);
      employeeRepo.findById.mockResolvedValue(employee);

      await expect(service.approve('lr-001', 'mgr-002', 'manager')).rejects.toThrow(ApproverNotAuthorizedError);
    });

    it('should reject manager when employee has no manager', async () => {
      const leaveRequest = makeLeaveRequest({ status: LeaveRequestStatus.SUBMITTED });
      const employee = makeEmployee({ managerId: null });

      leaveRequestRepo.findById.mockResolvedValue(leaveRequest);
      employeeRepo.findById.mockResolvedValue(employee);

      await expect(service.approve('lr-001', 'mgr-001', 'manager')).rejects.toThrow(ApproverNotAuthorizedError);
    });

    it('should fail when status is not SUBMITTED', async () => {
      const leaveRequest = makeLeaveRequest({ status: LeaveRequestStatus.DRAFT });

      leaveRequestRepo.findById.mockResolvedValue(leaveRequest);

      await expect(service.approve('lr-001', 'mgr-001', 'manager')).rejects.toThrow(InvalidStatusTransitionError);
    });

    it('should fail when leave request not found', async () => {
      leaveRequestRepo.findById.mockResolvedValue(null);

      await expect(service.approve('nonexistent', 'mgr-001', 'manager')).rejects.toThrow(LeaveRequestNotFoundError);
    });

    it('should fail when employee not found', async () => {
      const leaveRequest = makeLeaveRequest({ status: LeaveRequestStatus.SUBMITTED });
      leaveRequestRepo.findById.mockResolvedValue(leaveRequest);
      employeeRepo.findById.mockResolvedValue(null);

      await expect(service.approve('lr-001', 'mgr-001', 'manager')).rejects.toThrow(EmployeeNotFoundError);
    });
  });

  describe('reject', () => {
    it('should reject and restore balance', async () => {
      const leaveRequest = makeLeaveRequest({ status: LeaveRequestStatus.SUBMITTED });
      const employee = makeEmployee({ managerId: 'mgr-001' });
      const balance = makeBalance({ usedDays: 10, remainingDays: 10 });
      const holidays: Holiday[] = [];

      leaveRequestRepo.findById.mockResolvedValue(leaveRequest);
      employeeRepo.findById.mockResolvedValue(employee);
      holidayRepo.findByDateRange.mockResolvedValue(holidays);
      balanceRepo.findByEmployeeAndPolicy.mockResolvedValue(balance);
      balanceRepo.updateUsedDays.mockResolvedValue({ ...balance, usedDays: 5, remainingDays: 15 });
      leaveRequestRepo.update.mockResolvedValue({
        ...leaveRequest,
        status: LeaveRequestStatus.REJECTED,
        rejectedBy: 'mgr-001',
        rejectedAt: expect.any(Date) as Date,
        rejectionReason: 'Not enough coverage',
      });

      const result = await service.reject('lr-001', 'mgr-001', 'manager', 'Not enough coverage');

      expect(result.status).toBe(LeaveRequestStatus.REJECTED);
      expect(result.rejectedBy).toBe('mgr-001');
      expect(result.rejectionReason).toBe('Not enough coverage');
      expect(balanceRepo.updateUsedDays).toHaveBeenCalledWith('bal-001', 5);
      expect(auditRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'mgr-001',
          action: 'LEAVE_REJECTED',
          targetId: 'lr-001',
        }),
      );
      expect(notificationService.notifyLeaveStatusChange).toHaveBeenCalledWith(
        'emp-001',
        'lr-001',
        LeaveRequestStatus.SUBMITTED,
        LeaveRequestStatus.REJECTED,
      );
    });

    it('should reject by HR admin', async () => {
      const leaveRequest = makeLeaveRequest({ status: LeaveRequestStatus.SUBMITTED });
      const employee = makeEmployee({ managerId: null });
      const holidays: Holiday[] = [];

      leaveRequestRepo.findById.mockResolvedValue(leaveRequest);
      employeeRepo.findById.mockResolvedValue(employee);
      holidayRepo.findByDateRange.mockResolvedValue(holidays);
      balanceRepo.findByEmployeeAndPolicy.mockResolvedValue(null);
      leaveRequestRepo.update.mockResolvedValue({
        ...leaveRequest,
        status: LeaveRequestStatus.REJECTED,
        rejectedBy: 'hr-001',
        rejectedAt: expect.any(Date) as Date,
        rejectionReason: 'Policy violation',
      });

      const result = await service.reject('lr-001', 'hr-001', 'hr_admin', 'Policy violation');

      expect(result.status).toBe(LeaveRequestStatus.REJECTED);
      expect(result.rejectedBy).toBe('hr-001');
    });

    it('should clamp usedDays to 0 on restore', async () => {
      const leaveRequest = makeLeaveRequest({ status: LeaveRequestStatus.SUBMITTED });
      const employee = makeEmployee({ managerId: 'mgr-001' });
      const balance = makeBalance({ usedDays: 2, remainingDays: 18 });
      const holidays: Holiday[] = [];

      leaveRequestRepo.findById.mockResolvedValue(leaveRequest);
      employeeRepo.findById.mockResolvedValue(employee);
      holidayRepo.findByDateRange.mockResolvedValue(holidays);
      balanceRepo.findByEmployeeAndPolicy.mockResolvedValue(balance);
      balanceRepo.updateUsedDays.mockResolvedValue({ ...balance, usedDays: 0, remainingDays: 20 });
      leaveRequestRepo.update.mockResolvedValue({
        ...leaveRequest,
        status: LeaveRequestStatus.REJECTED,
        rejectedBy: 'mgr-001',
        rejectedAt: expect.any(Date) as Date,
        rejectionReason: 'Not needed',
      });

      await service.reject('lr-001', 'mgr-001', 'manager', 'Not needed');

      expect(balanceRepo.updateUsedDays).toHaveBeenCalledWith('bal-001', 0);
    });

    it('should fail with empty rejection reason', async () => {
      const leaveRequest = makeLeaveRequest({ status: LeaveRequestStatus.SUBMITTED });

      leaveRequestRepo.findById.mockResolvedValue(leaveRequest);

      await expect(service.reject('lr-001', 'mgr-001', 'manager', '')).rejects.toThrow(InvalidRejectionReasonError);
      await expect(service.reject('lr-001', 'mgr-001', 'manager', '   ')).rejects.toThrow(InvalidRejectionReasonError);
    });

    it('should fail when status is not SUBMITTED', async () => {
      const leaveRequest = makeLeaveRequest({ status: LeaveRequestStatus.APPROVED });

      leaveRequestRepo.findById.mockResolvedValue(leaveRequest);

      await expect(
        service.reject('lr-001', 'mgr-001', 'manager', 'Too late'),
      ).rejects.toThrow(InvalidStatusTransitionError);
    });

    it('should reject employee role from rejecting', async () => {
      const leaveRequest = makeLeaveRequest({ status: LeaveRequestStatus.SUBMITTED });
      const employee = makeEmployee();

      leaveRequestRepo.findById.mockResolvedValue(leaveRequest);
      employeeRepo.findById.mockResolvedValue(employee);

      await expect(
        service.reject('lr-001', 'emp-002', 'employee', 'reason'),
      ).rejects.toThrow(ApproverNotAuthorizedError);
    });
  });

  describe('cancel', () => {
    it('should cancel a SUBMITTED request and restore balance', async () => {
      const leaveRequest = makeLeaveRequest({ status: LeaveRequestStatus.SUBMITTED });
      const balance = makeBalance({ usedDays: 10, remainingDays: 10 });
      const holidays: Holiday[] = [];

      leaveRequestRepo.findById.mockResolvedValue(leaveRequest);
      holidayRepo.findByDateRange.mockResolvedValue(holidays);
      balanceRepo.findByEmployeeAndPolicy.mockResolvedValue(balance);
      balanceRepo.updateUsedDays.mockResolvedValue({ ...balance, usedDays: 5, remainingDays: 15 });
      leaveRequestRepo.update.mockResolvedValue({
        ...leaveRequest,
        status: LeaveRequestStatus.CANCELLED,
        cancelledBy: 'emp-001',
        cancelledAt: expect.any(Date) as Date,
      });

      const result = await service.cancel('lr-001', 'emp-001');

      expect(result.status).toBe(LeaveRequestStatus.CANCELLED);
      expect(result.cancelledBy).toBe('emp-001');
      expect(balanceRepo.updateUsedDays).toHaveBeenCalledWith('bal-001', 5);
      expect(auditRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'emp-001',
          action: 'LEAVE_CANCELLED',
          targetId: 'lr-001',
        }),
      );
      expect(notificationService.notifyLeaveStatusChange).toHaveBeenCalledWith(
        'emp-001',
        'lr-001',
        LeaveRequestStatus.SUBMITTED,
        LeaveRequestStatus.CANCELLED,
      );
    });

    it('should cancel an APPROVED request and restore balance', async () => {
      const leaveRequest = makeLeaveRequest({ status: LeaveRequestStatus.APPROVED });
      const balance = makeBalance({ usedDays: 10, remainingDays: 10 });
      const holidays: Holiday[] = [];

      leaveRequestRepo.findById.mockResolvedValue(leaveRequest);
      holidayRepo.findByDateRange.mockResolvedValue(holidays);
      balanceRepo.findByEmployeeAndPolicy.mockResolvedValue(balance);
      balanceRepo.updateUsedDays.mockResolvedValue({ ...balance, usedDays: 5, remainingDays: 15 });
      leaveRequestRepo.update.mockResolvedValue({
        ...leaveRequest,
        status: LeaveRequestStatus.CANCELLED,
        cancelledBy: 'emp-001',
        cancelledAt: expect.any(Date) as Date,
      });

      const result = await service.cancel('lr-001', 'emp-001');

      expect(result.status).toBe(LeaveRequestStatus.CANCELLED);
      expect(balanceRepo.updateUsedDays).toHaveBeenCalledWith('bal-001', 5);
    });

    it('should cancel even when no balance row exists', async () => {
      const leaveRequest = makeLeaveRequest({ status: LeaveRequestStatus.SUBMITTED });
      const holidays: Holiday[] = [];

      leaveRequestRepo.findById.mockResolvedValue(leaveRequest);
      holidayRepo.findByDateRange.mockResolvedValue(holidays);
      balanceRepo.findByEmployeeAndPolicy.mockResolvedValue(null);
      leaveRequestRepo.update.mockResolvedValue({
        ...leaveRequest,
        status: LeaveRequestStatus.CANCELLED,
        cancelledBy: 'emp-001',
        cancelledAt: expect.any(Date) as Date,
      });

      const result = await service.cancel('lr-001', 'emp-001');

      expect(result.status).toBe(LeaveRequestStatus.CANCELLED);
      expect(balanceRepo.updateUsedDays).not.toHaveBeenCalled();
    });

    it('should fail when status is DRAFT', async () => {
      const leaveRequest = makeLeaveRequest({ status: LeaveRequestStatus.DRAFT });

      leaveRequestRepo.findById.mockResolvedValue(leaveRequest);

      await expect(service.cancel('lr-001', 'emp-001')).rejects.toThrow(InvalidStatusTransitionError);
    });

    it('should fail when status is REJECTED', async () => {
      const leaveRequest = makeLeaveRequest({ status: LeaveRequestStatus.REJECTED });

      leaveRequestRepo.findById.mockResolvedValue(leaveRequest);

      await expect(service.cancel('lr-001', 'emp-001')).rejects.toThrow(InvalidStatusTransitionError);
    });

    it('should fail when status is CANCELLED', async () => {
      const leaveRequest = makeLeaveRequest({ status: LeaveRequestStatus.CANCELLED });

      leaveRequestRepo.findById.mockResolvedValue(leaveRequest);

      await expect(service.cancel('lr-001', 'emp-001')).rejects.toThrow(InvalidStatusTransitionError);
    });

    it('should fail when leave request not found', async () => {
      leaveRequestRepo.findById.mockResolvedValue(null);

      await expect(service.cancel('nonexistent', 'emp-001')).rejects.toThrow(LeaveRequestNotFoundError);
    });
  });

  describe('createDraft', () => {
    it('should create a DRAFT leave request', async () => {
      const dto: CreateLeaveRequestDto = {
        employeeId: 'emp-001',
        leavePolicyId: 'pol-001',
        startDate: new Date('2026-07-06'),
        endDate: new Date('2026-07-10'),
        reason: 'Vacation',
      };

      const created = makeLeaveRequest({ status: LeaveRequestStatus.DRAFT });
      leaveRequestRepo.create.mockResolvedValue(created);

      const result = await service.createDraft(dto);

      expect(result.status).toBe(LeaveRequestStatus.DRAFT);
      expect(leaveRequestRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          employeeId: 'emp-001',
          leavePolicyId: 'pol-001',
          status: LeaveRequestStatus.DRAFT,
        }),
      );
      expect(auditRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'emp-001',
          action: 'LEAVE_DRAFT_CREATED',
          targetId: 'lr-001',
          targetType: 'LeaveRequest',
        }),
      );
    });

    it('should propagate repository errors', async () => {
      const dto: CreateLeaveRequestDto = {
        employeeId: 'emp-001',
        leavePolicyId: 'pol-001',
        startDate: new Date('2026-07-06'),
        endDate: new Date('2026-07-10'),
      };

      leaveRequestRepo.create.mockRejectedValue(new Error('DB error'));

      await expect(service.createDraft(dto)).rejects.toThrow('DB error');
    });
  });

  describe('findById', () => {
    it('should return a leave request by id', async () => {
      const leaveRequest = makeLeaveRequest();
      leaveRequestRepo.findById.mockResolvedValue(leaveRequest);

      const result = await service.findById('lr-001');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('lr-001');
    });

    it('should return null when not found', async () => {
      leaveRequestRepo.findById.mockResolvedValue(null);

      const result = await service.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByEmployee', () => {
    it('should return leave requests for an employee', async () => {
      const requests = [makeLeaveRequest({ id: 'lr-001' }), makeLeaveRequest({ id: 'lr-002' })];
      leaveRequestRepo.findByEmployeeId.mockResolvedValue(requests);

      const result = await service.findByEmployee('emp-001');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('lr-001');
      expect(result[1].id).toBe('lr-002');
    });

    it('should return empty array when no requests', async () => {
      leaveRequestRepo.findByEmployeeId.mockResolvedValue([]);

      const result = await service.findByEmployee('emp-999');

      expect(result).toEqual([]);
    });
  });
});
