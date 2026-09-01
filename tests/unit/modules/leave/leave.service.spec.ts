import { PoolClient } from 'pg';
import {
  CreateLeaveRequestInput,
  InsufficientLeaveBalanceError,
  InvalidLeaveRequestTransitionError,
  LeaveRequest,
  LeaveService,
  OverlappingLeaveError,
  PgLeaveRequestRepository,
} from '../../../../src/modules/leave';
import { ILeaveRequestRepository } from '../../../../src/modules/leave/leave.model';
import { LeaveBalance } from '../../../../src/modules/balance';
import { ILeaveBalanceRepository } from '../../../../src/modules/balance/balance.model';
import { IUnitOfWork } from '../../../../src/shared/db/unit-of-work';
import { LeaveRequestStatus } from '../../../../src/shared/types';

function date(iso: string): Date {
  return new Date(iso);
}

function makeRequest(overrides: Partial<LeaveRequest> = {}): LeaveRequest {
  return {
    id: 'lr-1',
    employeeId: 'emp-1',
    leaveTypeId: 'lt-annual',
    startDate: date('2025-01-06T00:00:00.000Z'),
    endDate: date('2025-01-08T00:00:00.000Z'),
    reason: 'vacation',
    status: LeaveRequestStatus.PENDING,
    approvedBy: null,
    approvedAt: null,
    createdAt: date('2025-01-01T00:00:00.000Z'),
    updatedAt: date('2025-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

function applyInput(
  overrides: Partial<CreateLeaveRequestInput> = {},
): CreateLeaveRequestInput {
  const request = makeRequest();
  return {
    employeeId: request.employeeId,
    leaveTypeId: request.leaveTypeId,
    startDate: request.startDate,
    endDate: request.endDate,
    reason: request.reason,
    ...overrides,
  };
}

function makeBalance(overrides: Partial<LeaveBalance> = {}): LeaveBalance {
  return {
    id: 'bal-1',
    employeeId: 'emp-1',
    policyId: 'lt-annual',
    totalEntitlement: 20,
    usedDays: 0,
    remainingDays: 20,
    fiscalYear: 2025,
    status: 'ACTIVE',
    createdAt: date('2024-01-01T00:00:00.000Z'),
    updatedAt: date('2024-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

describe('LeaveService', () => {
  let leaveRequests: jest.Mocked<ILeaveRequestRepository>;
  let balances: jest.Mocked<ILeaveBalanceRepository>;
  let uow: jest.Mocked<IUnitOfWork>;
  let service: LeaveService;
  const fakeClient = {} as PoolClient;

  beforeEach(() => {
    leaveRequests = {
      create: jest.fn(),
      findById: jest.fn(),
      findByEmployee: jest.fn(),
      update: jest.fn(),
      list: jest.fn(),
    };
    balances = {
      create: jest.fn(),
      findById: jest.fn(),
      findByEmployee: jest.fn(),
      deduct: jest.fn(),
      restore: jest.fn(),
    };
    uow = {
      withTransaction: jest.fn(),
    };
    uow.withTransaction.mockImplementation(async (fn) => fn(fakeClient));

    service = new LeaveService(
      leaveRequests as unknown as PgLeaveRequestRepository,
      balances,
      uow,
    );
  });

  describe('apply', () => {
    it('assigns id/createdAt/updatedAt, status=PENDING and delegates to repo.create', async () => {
      const input = applyInput();
      leaveRequests.create.mockResolvedValue(makeRequest());

      const result = await service.apply(input);

      expect(leaveRequests.create).toHaveBeenCalledTimes(1);
      const calledWith = leaveRequests.create.mock.calls[0][0];
      expect(typeof calledWith.id).toBe('string');
      expect(calledWith.id.length).toBeGreaterThan(0);
      expect(calledWith.createdAt).toBeInstanceOf(Date);
      expect(calledWith.updatedAt).toBeInstanceOf(Date);
      expect(calledWith.status).toBe('PENDING');
      expect(calledWith.approvedBy).toBeNull();
      expect(calledWith.approvedAt).toBeNull();
      expect(calledWith.employeeId).toBe(input.employeeId);
      expect(calledWith.leaveTypeId).toBe(input.leaveTypeId);
      expect(result).toBeDefined();
    });
  });

  describe('lifecycle transitions', () => {
    it('approve: PENDING -> APPROVED sets approvedBy and approvedAt', async () => {
      const request = makeRequest();
      leaveRequests.findById.mockResolvedValue(request);
      leaveRequests.findByEmployee.mockResolvedValue([request]);
      balances.findByEmployee.mockResolvedValue([makeBalance()]);
      leaveRequests.update.mockResolvedValue(
        makeRequest({
          status: LeaveRequestStatus.APPROVED,
          approvedBy: 'mgr-1',
          approvedAt: new Date(),
        }),
      );

      const result = await service.approve('lr-1', 'mgr-1');

      expect(uow.withTransaction).toHaveBeenCalledTimes(1);
      expect(leaveRequests.update).toHaveBeenCalledWith(
        'lr-1',
        expect.objectContaining({
          status: 'APPROVED',
          approvedBy: 'mgr-1',
          approvedAt: expect.any(Date),
        }),
        fakeClient,
      );
      expect(result?.status).toBe('APPROVED');
    });

    it('reject: PENDING -> REJECTED', async () => {
      const request = makeRequest();
      leaveRequests.findById.mockResolvedValue(request);
      leaveRequests.update.mockResolvedValue(
        makeRequest({ status: LeaveRequestStatus.REJECTED, approvedBy: 'mgr-1' }),
      );

      const result = await service.reject('lr-1', 'mgr-1');

      expect(leaveRequests.update).toHaveBeenCalledWith(
        'lr-1',
        expect.objectContaining({ status: 'REJECTED', approvedBy: 'mgr-1' }),
        fakeClient,
      );
      expect(result?.status).toBe('REJECTED');
    });

    it('cancel: PENDING -> CANCELLED', async () => {
      const request = makeRequest();
      leaveRequests.findById.mockResolvedValue(request);
      leaveRequests.update.mockResolvedValue(
        makeRequest({ status: LeaveRequestStatus.CANCELLED }),
      );

      const result = await service.cancel('lr-1');

      expect(leaveRequests.update).toHaveBeenCalledWith(
        'lr-1',
        expect.objectContaining({ status: 'CANCELLED' }),
        fakeClient,
      );
      expect(result?.status).toBe('CANCELLED');
    });

    it('cancel: APPROVED -> CANCELLED', async () => {
      const request = makeRequest({ status: LeaveRequestStatus.APPROVED });
      leaveRequests.findById.mockResolvedValue(request);
      leaveRequests.update.mockResolvedValue(
        makeRequest({ status: LeaveRequestStatus.CANCELLED }),
      );

      const result = await service.cancel('lr-1');

      expect(leaveRequests.update).toHaveBeenCalledWith(
        'lr-1',
        expect.objectContaining({ status: 'CANCELLED' }),
        fakeClient,
      );
      expect(result?.status).toBe('CANCELLED');
    });

    it('approve rejects a non-PENDING request', async () => {
      const request = makeRequest({ status: LeaveRequestStatus.APPROVED });
      leaveRequests.findById.mockResolvedValue(request);

      await expect(service.approve('lr-1', 'mgr-1')).rejects.toThrow(
        InvalidLeaveRequestTransitionError,
      );
    });

    it('reject rejects a non-PENDING request', async () => {
      const request = makeRequest({ status: LeaveRequestStatus.CANCELLED });
      leaveRequests.findById.mockResolvedValue(request);

      await expect(service.reject('lr-1', 'mgr-1')).rejects.toThrow(
        InvalidLeaveRequestTransitionError,
      );
    });

    it('cancel rejects a REJECTED request', async () => {
      const request = makeRequest({ status: LeaveRequestStatus.REJECTED });
      leaveRequests.findById.mockResolvedValue(request);

      await expect(service.cancel('lr-1')).rejects.toThrow(
        InvalidLeaveRequestTransitionError,
      );
    });

    it('cancel rejects a CANCELLED request', async () => {
      const request = makeRequest({ status: LeaveRequestStatus.CANCELLED });
      leaveRequests.findById.mockResolvedValue(request);

      await expect(service.cancel('lr-1')).rejects.toThrow(
        InvalidLeaveRequestTransitionError,
      );
    });

    it('approve returns null when the request does not exist', async () => {
      leaveRequests.findById.mockResolvedValue(null);

      await expect(service.approve('missing', 'mgr-1')).resolves.toBeNull();
    });
  });

  describe('sufficiency check (n <= availableDays)', () => {
    it('approves when requested days <= availableDays', async () => {
      const request = makeRequest({
        startDate: date('2025-01-06T00:00:00.000Z'),
        endDate: date('2025-01-06T00:00:00.000Z'), // 1 day
      });
      leaveRequests.findById.mockResolvedValue(request);
      leaveRequests.findByEmployee.mockResolvedValue([request]);
      balances.findByEmployee.mockResolvedValue([
        makeBalance({ totalEntitlement: 20, usedDays: 5 }),
      ]);
      leaveRequests.update.mockResolvedValue(
        makeRequest({ status: LeaveRequestStatus.APPROVED, approvedBy: 'mgr-1' }),
      );

      const result = await service.approve('lr-1', 'mgr-1');

      expect(result?.status).toBe('APPROVED');
    });

    it('rejects when requested days exceed availableDays', async () => {
      const request = makeRequest({
        startDate: date('2025-01-06T00:00:00.000Z'),
        endDate: date('2025-01-08T00:00:00.000Z'), // 3 days
      });
      leaveRequests.findById.mockResolvedValue(request);
      leaveRequests.findByEmployee.mockResolvedValue([request]);
      balances.findByEmployee.mockResolvedValue([
        makeBalance({ totalEntitlement: 2, usedDays: 0 }),
      ]);
      leaveRequests.update.mockResolvedValue(
        makeRequest({ status: LeaveRequestStatus.APPROVED, approvedBy: 'mgr-1' }),
      );

      await expect(service.approve('lr-1', 'mgr-1')).rejects.toThrow(
        InsufficientLeaveBalanceError,
      );
    });

    it('rejects approval when availableDays is negative (no clamping)', async () => {
      const request = makeRequest({
        startDate: date('2025-01-06T00:00:00.000Z'),
        endDate: date('2025-01-06T00:00:00.000Z'), // 1 day
      });
      leaveRequests.findById.mockResolvedValue(request);
      leaveRequests.findByEmployee.mockResolvedValue([request]);
      balances.findByEmployee.mockResolvedValue([
        makeBalance({ totalEntitlement: 1, usedDays: 3 }),
      ]);
      leaveRequests.update.mockResolvedValue(
        makeRequest({ status: LeaveRequestStatus.APPROVED, approvedBy: 'mgr-1' }),
      );

      await expect(service.approve('lr-1', 'mgr-1')).rejects.toThrow(
        InsufficientLeaveBalanceError,
      );
    });

    it('counts other PENDING same-type requests against availableDays', async () => {
      const request = makeRequest({
        startDate: date('2025-01-06T00:00:00.000Z'),
        endDate: date('2025-01-07T00:00:00.000Z'), // 2 days total
      });
      const otherPending = makeRequest({
        id: 'lr-2',
        startDate: date('2025-01-10T00:00:00.000Z'),
        endDate: date('2025-01-10T00:00:00.000Z'), // 1 day pending
      });
      leaveRequests.findById.mockResolvedValue(request);
      leaveRequests.findByEmployee.mockResolvedValue([request, otherPending]);
      // entitlement 2, used 0, pending 1 -> available 1 < 2 requested
      balances.findByEmployee.mockResolvedValue([
        makeBalance({ totalEntitlement: 2, usedDays: 0 }),
      ]);
      leaveRequests.update.mockResolvedValue(
        makeRequest({ status: LeaveRequestStatus.APPROVED, approvedBy: 'mgr-1' }),
      );

      await expect(service.approve('lr-1', 'mgr-1')).rejects.toThrow(
        InsufficientLeaveBalanceError,
      );
    });
  });

  describe('overlap check (no overlapping APPROVED leave per employee)', () => {
    it('approves when there is no overlapping APPROVED leave', async () => {
      const request = makeRequest({
        startDate: date('2025-01-06T00:00:00.000Z'),
        endDate: date('2025-01-08T00:00:00.000Z'),
      });
      const existingApproved = makeRequest({
        id: 'lr-2',
        status: LeaveRequestStatus.APPROVED,
        leaveTypeId: 'lt-sick',
        startDate: date('2025-01-01T00:00:00.000Z'),
        endDate: date('2025-01-03T00:00:00.000Z'),
      });
      leaveRequests.findById.mockResolvedValue(request);
      leaveRequests.findByEmployee.mockResolvedValue([request, existingApproved]);
      balances.findByEmployee.mockResolvedValue([makeBalance()]);
      leaveRequests.update.mockResolvedValue(
        makeRequest({ status: LeaveRequestStatus.APPROVED, approvedBy: 'mgr-1' }),
      );

      const result = await service.approve('lr-1', 'mgr-1');

      expect(result?.status).toBe('APPROVED');
    });

    it('rejects when the range overlaps an APPROVED leave regardless of type', async () => {
      const request = makeRequest({
        startDate: date('2025-01-06T00:00:00.000Z'),
        endDate: date('2025-01-08T00:00:00.000Z'),
      });
      const existingApproved = makeRequest({
        id: 'lr-2',
        status: LeaveRequestStatus.APPROVED,
        leaveTypeId: 'lt-sick',
        startDate: date('2025-01-07T00:00:00.000Z'),
        endDate: date('2025-01-09T00:00:00.000Z'),
      });
      leaveRequests.findById.mockResolvedValue(request);
      leaveRequests.findByEmployee.mockResolvedValue([request, existingApproved]);
      balances.findByEmployee.mockResolvedValue([makeBalance()]);
      leaveRequests.update.mockResolvedValue(
        makeRequest({ status: LeaveRequestStatus.APPROVED, approvedBy: 'mgr-1' }),
      );

      await expect(service.approve('lr-1', 'mgr-1')).rejects.toThrow(
        OverlappingLeaveError,
      );
    });

    it('ignores overlapping PENDING or REJECTED requests', async () => {
      const request = makeRequest({
        startDate: date('2025-01-06T00:00:00.000Z'),
        endDate: date('2025-01-08T00:00:00.000Z'),
      });
      const pending = makeRequest({
        id: 'lr-2',
        status: LeaveRequestStatus.PENDING,
        leaveTypeId: 'lt-sick',
        startDate: date('2025-01-07T00:00:00.000Z'),
        endDate: date('2025-01-09T00:00:00.000Z'),
      });
      const rejected = makeRequest({
        id: 'lr-3',
        status: LeaveRequestStatus.REJECTED,
        startDate: date('2025-01-07T00:00:00.000Z'),
        endDate: date('2025-01-09T00:00:00.000Z'),
      });
      leaveRequests.findById.mockResolvedValue(request);
      leaveRequests.findByEmployee.mockResolvedValue([request, pending, rejected]);
      balances.findByEmployee.mockResolvedValue([makeBalance()]);
      leaveRequests.update.mockResolvedValue(
        makeRequest({ status: LeaveRequestStatus.APPROVED, approvedBy: 'mgr-1' }),
      );

      const result = await service.approve('lr-1', 'mgr-1');

      expect(result?.status).toBe('APPROVED');
    });
  });

  describe('list', () => {
    it('delegates to repo.list', async () => {
      const request = makeRequest();
      leaveRequests.list.mockResolvedValue([request]);

      const result = await service.list();

      expect(leaveRequests.list).toHaveBeenCalledWith(undefined);
      expect(result).toEqual([request]);
    });
  });
});
