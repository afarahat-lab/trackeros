import Fastify, { FastifyInstance } from 'fastify';
import { LeaveStatus } from '../../../../src/shared/types';
import { LeaveRequest } from '../../../../src/modules/leave-request';

const mockService = {
  createDraft: jest.fn(),
  submit: jest.fn(),
  approve: jest.fn(),
  reject: jest.fn(),
  cancel: jest.fn(),
  findById: jest.fn(),
  findByEmployeeId: jest.fn(),
  query: jest.fn(),
};

jest.mock('../../../../src/modules/leave-request/leave-request.service', () => ({
  LeaveRequestService: jest.fn().mockImplementation(() => mockService),
}));

jest.mock('../../../../src/modules/leave-request/leave-request.repository', () => ({
  LeaveRequestRepository: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('../../../../src/modules/leave-balance', () => ({
  LeaveBalanceRepository: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('../../../../src/modules/leave-policy', () => ({
  LeavePolicyRepository: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('../../../../src/modules/employee', () => ({
  EmployeeRepository: jest.fn().mockImplementation(() => ({})),
}));

import { leaveRequestRoutes } from '../../../../src/modules/leave-request/leave-request.routes';

function makeLeaveRequest(overrides: Partial<LeaveRequest> = {}): LeaveRequest {
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

function expectedSerialized(request: LeaveRequest): Record<string, unknown> {
  return {
    id: request.id,
    employeeId: request.employeeId,
    leavePolicyId: request.leavePolicyId,
    startDate: request.startDate.toISOString(),
    endDate: request.endDate.toISOString(),
    reason: request.reason,
    status: request.status,
    approvedBy: request.approvedBy,
    approvedAt: request.approvedAt?.toISOString() ?? null,
    cancelledAt: request.cancelledAt?.toISOString() ?? null,
    createdAt: request.createdAt.toISOString(),
    updatedAt: request.updatedAt.toISOString(),
  };
}

describe('leaveRequestRoutes', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    jest.clearAllMocks();
    app = Fastify({ logger: false });
    await app.register(leaveRequestRoutes);
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  // ─── POST /leave-requests ─────────────────────────────────────

  describe('POST /leave-requests', () => {
    it('should create a draft and return 201', async () => {
      const created = makeLeaveRequest();
      mockService.createDraft.mockResolvedValue(created);

      const response = await app.inject({
        method: 'POST',
        url: '/leave-requests',
        payload: {
          employeeId: 'emp-001',
          leavePolicyId: 'lp-001',
          startDate: '2026-08-10T00:00:00.000Z',
          endDate: '2026-08-14T00:00:00.000Z',
          reason: 'Vacation',
        },
      });

      expect(response.statusCode).toBe(201);
      expect(response.json()).toEqual(expectedSerialized(created));
    });

    it('should return 404 for EMPLOYEE_NOT_FOUND', async () => {
      mockService.createDraft.mockRejectedValue({
        error: 'Employee not found',
        code: 'EMPLOYEE_NOT_FOUND',
      });

      const response = await app.inject({
        method: 'POST',
        url: '/leave-requests',
        payload: {
          employeeId: 'emp-999',
          leavePolicyId: 'lp-001',
          startDate: '2026-08-10T00:00:00.000Z',
          endDate: '2026-08-14T00:00:00.000Z',
          reason: 'Vacation',
        },
      });

      expect(response.statusCode).toBe(404);
      expect(response.json()).toEqual({
        error: 'Employee not found',
        code: 'EMPLOYEE_NOT_FOUND',
      });
    });

    it('should return 404 for POLICY_NOT_FOUND', async () => {
      mockService.createDraft.mockRejectedValue({
        error: 'Leave policy not found',
        code: 'POLICY_NOT_FOUND',
      });

      const response = await app.inject({
        method: 'POST',
        url: '/leave-requests',
        payload: {
          employeeId: 'emp-001',
          leavePolicyId: 'lp-999',
          startDate: '2026-08-10T00:00:00.000Z',
          endDate: '2026-08-14T00:00:00.000Z',
          reason: 'Vacation',
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 409 for POLICY_INACTIVE', async () => {
      mockService.createDraft.mockRejectedValue({
        error: 'Leave policy is not active',
        code: 'POLICY_INACTIVE',
      });

      const response = await app.inject({
        method: 'POST',
        url: '/leave-requests',
        payload: {
          employeeId: 'emp-001',
          leavePolicyId: 'lp-001',
          startDate: '2026-08-10T00:00:00.000Z',
          endDate: '2026-08-14T00:00:00.000Z',
          reason: 'Vacation',
        },
      });

      expect(response.statusCode).toBe(409);
    });

    it('should return 400 for INVALID_DATE_RANGE', async () => {
      mockService.createDraft.mockRejectedValue({
        error: 'startDate must be on or before endDate',
        code: 'INVALID_DATE_RANGE',
      });

      const response = await app.inject({
        method: 'POST',
        url: '/leave-requests',
        payload: {
          employeeId: 'emp-001',
          leavePolicyId: 'lp-001',
          startDate: '2026-08-20T00:00:00.000Z',
          endDate: '2026-08-14T00:00:00.000Z',
          reason: 'Vacation',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 500 for unexpected errors', async () => {
      mockService.createDraft.mockRejectedValue(new Error('Something went wrong'));

      const response = await app.inject({
        method: 'POST',
        url: '/leave-requests',
        payload: {
          employeeId: 'emp-001',
          leavePolicyId: 'lp-001',
          startDate: '2026-08-10T00:00:00.000Z',
          endDate: '2026-08-14T00:00:00.000Z',
          reason: 'Vacation',
        },
      });

      expect(response.statusCode).toBe(500);
      expect(response.json()).toEqual({ error: 'Internal Server Error' });
    });
  });

  // ─── POST /leave-requests/:id/submit ──────────────────────────

  describe('POST /leave-requests/:id/submit', () => {
    it('should submit and return 200', async () => {
      const submitted = makeLeaveRequest({ status: LeaveStatus.SUBMITTED });
      mockService.submit.mockResolvedValue(submitted);

      const response = await app.inject({
        method: 'POST',
        url: '/leave-requests/lr-001/submit',
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual(expectedSerialized(submitted));
    });

    it('should return 404 for REQUEST_NOT_FOUND', async () => {
      mockService.submit.mockRejectedValue({
        error: 'Leave request not found',
        code: 'REQUEST_NOT_FOUND',
      });

      const response = await app.inject({
        method: 'POST',
        url: '/leave-requests/lr-999/submit',
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 409 for INVALID_STATE_TRANSITION', async () => {
      mockService.submit.mockRejectedValue({
        error: 'Only DRAFT requests can be submitted',
        code: 'INVALID_STATE_TRANSITION',
      });

      const response = await app.inject({
        method: 'POST',
        url: '/leave-requests/lr-001/submit',
      });

      expect(response.statusCode).toBe(409);
    });
  });

  // ─── POST /leave-requests/:id/approve ─────────────────────────

  describe('POST /leave-requests/:id/approve', () => {
    it('should approve and return 200', async () => {
      const approved = makeLeaveRequest({
        status: LeaveStatus.APPROVED,
        approvedBy: 'mgr-001',
        approvedAt: new Date('2026-08-16T12:00:00Z'),
      });
      mockService.approve.mockResolvedValue(approved);

      const response = await app.inject({
        method: 'POST',
        url: '/leave-requests/lr-001/approve',
        payload: { approverId: 'mgr-001' },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.status).toBe(LeaveStatus.APPROVED);
      expect(body.approvedBy).toBe('mgr-001');
      expect(body.approvedAt).toBe('2026-08-16T12:00:00.000Z');
    });

    it('should return 403 for NOT_MANAGER', async () => {
      mockService.approve.mockRejectedValue({
        error: "Only the employee's manager can approve this request",
        code: 'NOT_MANAGER',
      });

      const response = await app.inject({
        method: 'POST',
        url: '/leave-requests/lr-001/approve',
        payload: { approverId: 'mgr-999' },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return 409 for INVALID_STATE_TRANSITION', async () => {
      mockService.approve.mockRejectedValue({
        error: 'Only SUBMITTED requests can be approved',
        code: 'INVALID_STATE_TRANSITION',
      });

      const response = await app.inject({
        method: 'POST',
        url: '/leave-requests/lr-001/approve',
        payload: { approverId: 'mgr-001' },
      });

      expect(response.statusCode).toBe(409);
    });
  });

  // ─── POST /leave-requests/:id/reject ──────────────────────────

  describe('POST /leave-requests/:id/reject', () => {
    it('should reject and return 200', async () => {
      const rejected = makeLeaveRequest({ status: LeaveStatus.REJECTED });
      mockService.reject.mockResolvedValue(rejected);

      const response = await app.inject({
        method: 'POST',
        url: '/leave-requests/lr-001/reject',
        payload: { approverId: 'mgr-001' },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().status).toBe(LeaveStatus.REJECTED);
    });

    it('should return 403 for NOT_MANAGER', async () => {
      mockService.reject.mockRejectedValue({
        error: "Only the employee's manager can reject this request",
        code: 'NOT_MANAGER',
      });

      const response = await app.inject({
        method: 'POST',
        url: '/leave-requests/lr-001/reject',
        payload: { approverId: 'mgr-999' },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  // ─── POST /leave-requests/:id/cancel ──────────────────────────

  describe('POST /leave-requests/:id/cancel', () => {
    it('should cancel and return 200', async () => {
      const cancelled = makeLeaveRequest({
        status: LeaveStatus.CANCELLED,
        cancelledAt: new Date('2026-08-16T12:00:00Z'),
      });
      mockService.cancel.mockResolvedValue(cancelled);

      const response = await app.inject({
        method: 'POST',
        url: '/leave-requests/lr-001/cancel',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.status).toBe(LeaveStatus.CANCELLED);
      expect(body.cancelledAt).toBe('2026-08-16T12:00:00.000Z');
    });

    it('should return 409 for INVALID_STATE_TRANSITION', async () => {
      mockService.cancel.mockRejectedValue({
        error: 'Only SUBMITTED or APPROVED requests can be cancelled',
        code: 'INVALID_STATE_TRANSITION',
      });

      const response = await app.inject({
        method: 'POST',
        url: '/leave-requests/lr-001/cancel',
      });

      expect(response.statusCode).toBe(409);
    });
  });

  // ─── GET /leave-requests/:id ──────────────────────────────────

  describe('GET /leave-requests/:id', () => {
    it('should return a leave request', async () => {
      const request = makeLeaveRequest();
      mockService.findById.mockResolvedValue(request);

      const response = await app.inject({
        method: 'GET',
        url: '/leave-requests/lr-001',
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual(expectedSerialized(request));
    });

    it('should return 404 when not found', async () => {
      mockService.findById.mockResolvedValue(null);

      const response = await app.inject({
        method: 'GET',
        url: '/leave-requests/lr-999',
      });

      expect(response.statusCode).toBe(404);
      expect(response.json()).toEqual({
        error: 'Leave request not found',
        code: 'REQUEST_NOT_FOUND',
      });
    });
  });

  // ─── GET /leave-requests ──────────────────────────────────────

  describe('GET /leave-requests', () => {
    it('should query and return results', async () => {
      const requests = [makeLeaveRequest(), makeLeaveRequest({ id: 'lr-002' })];
      mockService.query.mockResolvedValue(requests);

      const response = await app.inject({
        method: 'GET',
        url: '/leave-requests?employeeId=emp-001&status=DRAFT',
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toHaveLength(2);
      expect(mockService.query).toHaveBeenCalledWith({
        employeeId: 'emp-001',
        status: 'DRAFT',
        leavePolicyId: undefined,
        startDateFrom: undefined,
        startDateTo: undefined,
      });
    });

    it('should return empty array when no results', async () => {
      mockService.query.mockResolvedValue([]);

      const response = await app.inject({
        method: 'GET',
        url: '/leave-requests',
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual([]);
    });
  });

  // ─── GET /leave-requests/employee/:employeeId ─────────────────

  describe('GET /leave-requests/employee/:employeeId', () => {
    it('should return employee leave requests', async () => {
      const requests = [makeLeaveRequest()];
      mockService.findByEmployeeId.mockResolvedValue(requests);

      const response = await app.inject({
        method: 'GET',
        url: '/leave-requests/employee/emp-001',
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toHaveLength(1);
      expect(mockService.findByEmployeeId).toHaveBeenCalledWith('emp-001');
    });

    it('should return empty array when none found', async () => {
      mockService.findByEmployeeId.mockResolvedValue([]);

      const response = await app.inject({
        method: 'GET',
        url: '/leave-requests/employee/emp-999',
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual([]);
    });
  });

  // ─── Date serialization ───────────────────────────────────────

  describe('date serialization', () => {
    it('should serialize all Date fields as ISO 8601 strings', async () => {
      const request = makeLeaveRequest({
        status: LeaveStatus.APPROVED,
        approvedBy: 'mgr-001',
        approvedAt: new Date('2026-08-16T12:00:00Z'),
        startDate: new Date('2026-08-10'),
        endDate: new Date('2026-08-14'),
        createdAt: new Date('2026-08-01T00:00:00Z'),
        updatedAt: new Date('2026-08-01T00:00:00Z'),
      });
      mockService.findById.mockResolvedValue(request);

      const response = await app.inject({
        method: 'GET',
        url: '/leave-requests/lr-001',
      });

      const body = response.json();
      expect(typeof body.startDate).toBe('string');
      expect(typeof body.endDate).toBe('string');
      expect(typeof body.approvedAt).toBe('string');
      expect(body.cancelledAt).toBeNull();
      expect(typeof body.createdAt).toBe('string');
      expect(typeof body.updatedAt).toBe('string');
      expect(body.startDate).toBe('2026-08-10T00:00:00.000Z');
      expect(body.endDate).toBe('2026-08-14T00:00:00.000Z');
      expect(body.approvedAt).toBe('2026-08-16T12:00:00.000Z');
    });

    it('should serialize null approvedAt and cancelledAt correctly', async () => {
      const request = makeLeaveRequest({ status: LeaveStatus.DRAFT });
      mockService.findById.mockResolvedValue(request);

      const response = await app.inject({
        method: 'GET',
        url: '/leave-requests/lr-001',
      });

      const body = response.json();
      expect(body.approvedAt).toBeNull();
      expect(body.cancelledAt).toBeNull();
    });
  });
});
