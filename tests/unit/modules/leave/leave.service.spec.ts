import {
  LeaveService,
  fiscalYearForStartDate,
} from '../../../../src/modules/leave/leave.service';
import type { ILeaveRequestRepository } from '../../../../src/modules/leave/leave.repository';
import type { ILeaveBalanceRepository } from '../../../../src/modules/balance/balance.repository';
import type { ILeavePolicyRepository } from '../../../../src/modules/policy/policy.repository';
import type { IAuditLogRepository } from '../../../../src/modules/audit/audit.repository';
import { AuditService } from '../../../../src/modules/audit/audit.service';
import type { LeaveRequest } from '../../../../src/modules/leave/leave.model';
import type { LeaveBalance } from '../../../../src/modules/balance/balance.model';
import type { LeavePolicy } from '../../../../src/modules/policy/policy.model';
import { LeaveStatus, LeaveType, AuditAction } from '../../../../src/shared/types';
import type { CreateLeaveRequestDto } from '../../../../src/shared/types';

describe('fiscalYearForStartDate', () => {
  it('attributes a request to the calendar year of its start date', () => {
    expect(fiscalYearForStartDate(new Date('2026-06-01T00:00:00.000Z'))).toBe(2026);
  });

  it('attributes a boundary-crossing request entirely to the start-date year', () => {
    expect(fiscalYearForStartDate(new Date('2025-12-30T00:00:00.000Z'))).toBe(2025);
  });
});

describe('LeaveService', () => {
  const now = new Date('2026-03-01T12:00:00.000Z');

  function makeRequest(overrides: Partial<LeaveRequest> = {}): LeaveRequest {
    return {
      id: 'lr-1',
      employeeId: 'emp-1',
      leaveType: LeaveType.annual,
      startDate: new Date('2026-06-01T00:00:00.000Z'),
      endDate: new Date('2026-06-03T00:00:00.000Z'),
      reason: 'vacation',
      status: LeaveStatus.PENDING,
      approvedBy: null,
      approvedAt: null,
      createdAt: now,
      updatedAt: now,
      ...overrides,
    };
  }

  function makeBalance(overrides: Partial<LeaveBalance> = {}): LeaveBalance {
    return {
      id: 'bal-1',
      employeeId: 'emp-1',
      policyId: 'pol-1',
      totalEntitlement: 20,
      usedDays: 0,
      remainingDays: 20,
      fiscalYear: 2026,
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
      ...overrides,
    };
  }

  function makePolicy(overrides: Partial<LeavePolicy> = {}): LeavePolicy {
    return {
      id: 'pol-1',
      policyName: 'Annual',
      leaveType: LeaveType.annual,
      entitlementDays: 20,
      accrualRate: undefined,
      maxAccumulation: undefined,
      minimumNoticeDays: undefined,
      requiresManagerApproval: true,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      ...overrides,
    };
  }

  function build(overrides: {
    requests?: Partial<ILeaveRequestRepository>;
    balances?: Partial<ILeaveBalanceRepository>;
    policies?: Partial<ILeavePolicyRepository>;
    audit?: IAuditLogRepository;
  } = {}) {
    const requests: ILeaveRequestRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByEmployee: jest.fn(),
      findByStatus: jest.fn(),
      update: jest.fn(),
      ...overrides.requests,
    };
    const balances: ILeaveBalanceRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByEmployee: jest.fn(),
      findByEmployeeAndPolicy: jest.fn(),
      findByEmployeeAndFiscalYear: jest.fn(),
      update: jest.fn(),
      commitDays: jest.fn(),
      ...overrides.balances,
    };
    const policies: ILeavePolicyRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByLeaveType: jest.fn(),
      findActive: jest.fn(),
      update: jest.fn(),
      ...overrides.policies,
    };
    const audit = new AuditService(overrides.audit ?? { record: jest.fn() });

    const service = new LeaveService({ requests, balances, policies, audit });
    return { service, requests, balances, policies, audit };
  }

  describe('create', () => {
    it('creates the request as PENDING immediately and writes an audit record', async () => {
      const auditRecord = jest.fn().mockResolvedValue({});
      const { service, requests } = build({ audit: { record: auditRecord } });

      const input: CreateLeaveRequestDto = {
        employeeId: 'emp-1',
        leaveType: LeaveType.annual,
        startDate: new Date('2026-06-01T00:00:00.000Z'),
        endDate: new Date('2026-06-03T00:00:00.000Z'),
        reason: 'vacation',
      };
      const created = makeRequest();
      (requests.create as jest.Mock).mockResolvedValue(created);

      await expect(service.create(input)).resolves.toBe(created);
      expect(requests.create).toHaveBeenCalledWith(input, undefined);
      expect(auditRecord).toHaveBeenCalledWith(
        expect.objectContaining({ entityType: 'LEAVE_REQUEST', action: AuditAction.CREATE }),
        undefined
      );
    });
  });

  describe('approve', () => {
    it('debits the start-date-year balance with the shared day count and approves', async () => {
      const request = makeRequest(); // Jun 1 -> Jun 3 == 3 inclusive days, fiscal year 2026
      const balance = makeBalance();
      const policy = makePolicy();
      const updated = { ...request, status: LeaveStatus.APPROVED, approvedBy: 'mgr-1' };

      const auditRecord = jest.fn().mockResolvedValue({});
      const { service, requests, balances, policies } = build({
        audit: { record: auditRecord },
      });

      (requests.findById as jest.Mock).mockResolvedValue(request);
      (policies.findByLeaveType as jest.Mock).mockResolvedValue([policy]);
      (balances.findByEmployeeAndFiscalYear as jest.Mock).mockResolvedValue(balance);
      (balances.commitDays as jest.Mock).mockResolvedValue({ ...balance, usedDays: 3, remainingDays: 17 });
      (requests.update as jest.Mock).mockResolvedValue(updated);

      await service.approve('lr-1', 'mgr-1');

      expect(balances.findByEmployeeAndFiscalYear).toHaveBeenCalledWith('emp-1', 'pol-1', 2026);
      expect(balances.commitDays).toHaveBeenCalledWith('emp-1', 'pol-1', 2026, 3, undefined);
      expect(requests.update).toHaveBeenCalledWith(
        'lr-1',
        expect.objectContaining({ status: LeaveStatus.APPROVED, approvedBy: 'mgr-1' }),
        undefined
      );
      expect(auditRecord).toHaveBeenCalled();
    });

    it('rejects approval (does not debit) when remainingDays would go below zero', async () => {
      const request = makeRequest(); // 3 days
      const policy = makePolicy();
      const balance = makeBalance({ remainingDays: 1, usedDays: 19 });

      const { service, requests, balances, policies } = build();

      (requests.findById as jest.Mock).mockResolvedValue(request);
      (policies.findByLeaveType as jest.Mock).mockResolvedValue([policy]);
      (balances.findByEmployeeAndFiscalYear as jest.Mock).mockResolvedValue(balance);

      await expect(service.approve('lr-1', 'mgr-1')).rejects.toMatchObject({ code: 'FORBIDDEN' });
      expect(balances.commitDays).not.toHaveBeenCalled();
      expect(requests.update).not.toHaveBeenCalled();
    });

    it('rejects a manager approving their own request', async () => {
      const request = makeRequest({ employeeId: 'mgr-1' });
      const { service, requests, balances, policies } = build();

      (requests.findById as jest.Mock).mockResolvedValue(request);

      await expect(service.approve('lr-1', 'mgr-1')).rejects.toMatchObject({ code: 'FORBIDDEN' });
      expect(policies.findByLeaveType).not.toHaveBeenCalled();
      expect(balances.commitDays).not.toHaveBeenCalled();
    });

    it('rejects an approval not initiated from PENDING', async () => {
      const request = makeRequest({ status: LeaveStatus.APPROVED });
      const { service, requests } = build();

      (requests.findById as jest.Mock).mockResolvedValue(request);

      await expect(service.approve('lr-1', 'mgr-1')).rejects.toMatchObject({
        code: 'INVALID_LEAVE_STATE',
      });
    });

    it('throws LEAVE_NOT_FOUND for an unknown request', async () => {
      const { service, requests } = build();
      (requests.findById as jest.Mock).mockResolvedValue(null);

      await expect(service.approve('lr-unknown', 'mgr-1')).rejects.toMatchObject({
        code: 'LEAVE_NOT_FOUND',
      });
    });
  });

  describe('reject', () => {
    it('rejects a PENDING request without debiting balance', async () => {
      const request = makeRequest();
      const updated = { ...request, status: LeaveStatus.REJECTED, approvedBy: 'mgr-1' };
      const auditRecord = jest.fn().mockResolvedValue({});

      const { service, requests, balances } = build({ audit: { record: auditRecord } });

      (requests.findById as jest.Mock).mockResolvedValue(request);
      (requests.update as jest.Mock).mockResolvedValue(updated);

      await service.reject('lr-1', 'mgr-1');

      expect(requests.update).toHaveBeenCalledWith(
        'lr-1',
        expect.objectContaining({ status: LeaveStatus.REJECTED, approvedBy: 'mgr-1' }),
        undefined
      );
      expect(balances.commitDays).not.toHaveBeenCalled();
      expect(auditRecord).toHaveBeenCalled();
    });

    it('rejects a manager rejecting their own request', async () => {
      const request = makeRequest({ employeeId: 'mgr-1' });
      const { service, requests, balances } = build();

      (requests.findById as jest.Mock).mockResolvedValue(request);

      await expect(service.reject('lr-1', 'mgr-1')).rejects.toMatchObject({ code: 'FORBIDDEN' });
      expect(balances.commitDays).not.toHaveBeenCalled();
      expect(requests.update).not.toHaveBeenCalled();
    });
  });

  describe('cancel', () => {
    it('cancels the owner’s PENDING request', async () => {
      const request = makeRequest();
      const updated = { ...request, status: LeaveStatus.CANCELLED };
      const auditRecord = jest.fn().mockResolvedValue({});

      const { service, requests } = build({ audit: { record: auditRecord } });

      (requests.findById as jest.Mock).mockResolvedValue(request);
      (requests.update as jest.Mock).mockResolvedValue(updated);

      await service.cancel('lr-1', 'emp-1');

      expect(requests.update).toHaveBeenCalledWith(
        'lr-1',
        expect.objectContaining({ status: LeaveStatus.CANCELLED }),
        undefined
      );
      expect(auditRecord).toHaveBeenCalled();
    });

    it('rejects cancelling someone else’s request', async () => {
      const request = makeRequest({ employeeId: 'emp-1' });
      const { service, requests } = build();

      (requests.findById as jest.Mock).mockResolvedValue(request);

      await expect(service.cancel('lr-1', 'emp-2')).rejects.toMatchObject({ code: 'FORBIDDEN' });
      expect(requests.update).not.toHaveBeenCalled();
    });

    it('rejects cancelling a request that is not PENDING', async () => {
      const request = makeRequest({ status: LeaveStatus.APPROVED });
      const { service, requests } = build();

      (requests.findById as jest.Mock).mockResolvedValue(request);

      await expect(service.cancel('lr-1', 'emp-1')).rejects.toMatchObject({
        code: 'INVALID_LEAVE_STATE',
      });
    });
  });
});
