import Fastify, { FastifyInstance } from 'fastify';
import { leaveRoutes } from 'modules/leave/leave.routes';
import { LeaveService } from 'modules/leave/leave.service';
import { InsufficientBalanceError } from 'modules/balance/balance.model';
import { LeaveRequestStatus } from 'shared/types';

jest.mock('modules/leave/leave.service');

const MockLeaveService = LeaveService as jest.MockedClass<typeof LeaveService>;

function buildApp(): FastifyInstance {
  const app = Fastify({ logger: false });
  app.register(leaveRoutes);
  return app;
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

describe('Leave Routes Integration', () => {
  let app: FastifyInstance;
  let mockService: jest.Mocked<LeaveService>;

  beforeEach(async () => {
    MockLeaveService.mockClear();
    app = buildApp();
    await app.ready();

    const mockInstance = (MockLeaveService as unknown as { mock: { instances: LeaveService[] } }).mock;
    mockService = mockInstance.instances[0] as jest.Mocked<LeaveService>;
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /api/leave/requests', () => {
    it('should return 201 and the created leave request on success', async () => {
      const lr = makeLeaveRequest();
      mockService.submitLeaveRequest.mockResolvedValue(lr);

      const response = await app.inject({
        method: 'POST',
        url: '/api/leave/requests',
        payload: {
          employeeId: 'emp-1',
          policyId: 'pol-1',
          startDate: '2026-07-01',
          endDate: '2026-07-03',
          reason: 'Vacation',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.payload);
      expect(body.id).toBe('lr-1');
      expect(body.status).toBe(LeaveRequestStatus.SUBMITTED);
    });

    it('should return 400 when employeeId is missing', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/leave/requests',
        payload: {
          policyId: 'pol-1',
          startDate: '2026-07-01',
          endDate: '2026-07-03',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.payload);
      expect(body.errors).toBeDefined();
      expect(body.errors.some((e: string) => e.includes('employeeId'))).toBe(true);
    });

    it('should return 400 when policyId is missing', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/leave/requests',
        payload: {
          employeeId: 'emp-1',
          startDate: '2026-07-01',
          endDate: '2026-07-03',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.payload);
      expect(body.errors).toBeDefined();
      expect(body.errors.some((e: string) => e.includes('policyId'))).toBe(true);
    });

    it('should return 400 when startDate is missing', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/leave/requests',
        payload: {
          employeeId: 'emp-1',
          policyId: 'pol-1',
          endDate: '2026-07-03',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.payload);
      expect(body.errors).toBeDefined();
      expect(body.errors.some((e: string) => e.includes('startDate'))).toBe(true);
    });

    it('should return 400 when endDate is missing', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/leave/requests',
        payload: {
          employeeId: 'emp-1',
          policyId: 'pol-1',
          startDate: '2026-07-01',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.payload);
      expect(body.errors).toBeDefined();
      expect(body.errors.some((e: string) => e.includes('endDate'))).toBe(true);
    });

    it('should return 400 when startDate is invalid', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/leave/requests',
        payload: {
          employeeId: 'emp-1',
          policyId: 'pol-1',
          startDate: 'not-a-date',
          endDate: '2026-07-03',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.payload);
      expect(body.errors.some((e: string) => e.includes('startDate'))).toBe(true);
    });

    it('should return 409 on InsufficientBalanceError', async () => {
      mockService.submitLeaveRequest.mockRejectedValue(
        new InsufficientBalanceError('bal-1', 5, 2),
      );

      const response = await app.inject({
        method: 'POST',
        url: '/api/leave/requests',
        payload: {
          employeeId: 'emp-1',
          policyId: 'pol-1',
          startDate: '2026-07-01',
          endDate: '2026-07-05',
        },
      });

      expect(response.statusCode).toBe(409);
    });

    it('should return 400 on service error', async () => {
      mockService.submitLeaveRequest.mockRejectedValue(
        new Error('Employee not found: emp-99'),
      );

      const response = await app.inject({
        method: 'POST',
        url: '/api/leave/requests',
        payload: {
          employeeId: 'emp-99',
          policyId: 'pol-1',
          startDate: '2026-07-01',
          endDate: '2026-07-03',
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /api/leave/requests/:requestId', () => {
    it('should return 200 and the leave request when found', async () => {
      const lr = makeLeaveRequest();
      mockService.getLeaveRequest.mockResolvedValue(lr);

      const response = await app.inject({
        method: 'GET',
        url: '/api/leave/requests/lr-1',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.id).toBe('lr-1');
    });

    it('should return 404 when not found', async () => {
      mockService.getLeaveRequest.mockResolvedValue(null);

      const response = await app.inject({
        method: 'GET',
        url: '/api/leave/requests/lr-999',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('GET /api/leave/employees/:employeeId/requests', () => {
    it('should return 200 and an array of leave requests', async () => {
      const lr = makeLeaveRequest();
      mockService.getEmployeeLeaveRequests.mockResolvedValue([lr]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/leave/employees/emp-1/requests',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBe(1);
    });

    it('should return 200 and an empty array when no requests', async () => {
      mockService.getEmployeeLeaveRequests.mockResolvedValue([]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/leave/employees/emp-1/requests',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body).toEqual([]);
    });

    it('should pass query params to the service', async () => {
      mockService.getEmployeeLeaveRequests.mockResolvedValue([]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/leave/employees/emp-1/requests?status=SUBMITTED&limit=10&offset=0',
      });

      expect(response.statusCode).toBe(200);
      expect(mockService.getEmployeeLeaveRequests).toHaveBeenCalledWith(
        'emp-1',
        expect.objectContaining({
          status: 'SUBMITTED',
          limit: 10,
          offset: 0,
        }),
      );
    });
  });

  describe('POST /api/leave/requests/:requestId/approve', () => {
    it('should return 200 and the approved request', async () => {
      const lr = makeLeaveRequest({ status: LeaveRequestStatus.APPROVED, approvedBy: 'mgr-1' });
      mockService.approveLeaveRequest.mockResolvedValue(lr);

      const response = await app.inject({
        method: 'POST',
        url: '/api/leave/requests/lr-1/approve',
        headers: {
          'x-user-id': 'mgr-1',
          'x-user-role': 'manager',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.status).toBe(LeaveRequestStatus.APPROVED);
    });

    it('should return 403 when approver role is not manager or hr_admin', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/leave/requests/lr-1/approve',
        headers: {
          'x-user-id': 'emp-1',
          'x-user-role': 'employee',
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return 200 when approver is hr_admin', async () => {
      const lr = makeLeaveRequest({ status: LeaveRequestStatus.APPROVED, approvedBy: 'hr-1' });
      mockService.approveLeaveRequest.mockResolvedValue(lr);

      const response = await app.inject({
        method: 'POST',
        url: '/api/leave/requests/lr-1/approve',
        headers: {
          'x-user-id': 'hr-1',
          'x-user-role': 'hr_admin',
        },
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe('POST /api/leave/requests/:requestId/reject', () => {
    it('should return 200 and the rejected request', async () => {
      const lr = makeLeaveRequest({ status: LeaveRequestStatus.REJECTED, rejectionReason: 'Not needed' });
      mockService.rejectLeaveRequest.mockResolvedValue(lr);

      const response = await app.inject({
        method: 'POST',
        url: '/api/leave/requests/lr-1/reject',
        payload: { reason: 'Not needed' },
        headers: {
          'x-user-id': 'mgr-1',
          'x-user-role': 'manager',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.status).toBe(LeaveRequestStatus.REJECTED);
    });

    it('should return 403 when approver role is not manager or hr_admin', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/leave/requests/lr-1/reject',
        payload: { reason: 'Not needed' },
        headers: {
          'x-user-id': 'emp-1',
          'x-user-role': 'employee',
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return 400 when reason is missing', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/leave/requests/lr-1/reject',
        payload: {},
        headers: {
          'x-user-id': 'mgr-1',
          'x-user-role': 'manager',
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('POST /api/leave/requests/:requestId/cancel', () => {
    it('should return 200 and the cancelled request', async () => {
      const lr = makeLeaveRequest({ status: LeaveRequestStatus.CANCELLED });
      mockService.cancelLeaveRequest.mockResolvedValue(lr);

      const response = await app.inject({
        method: 'POST',
        url: '/api/leave/requests/lr-1/cancel',
        headers: {
          'x-user-id': 'emp-1',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.status).toBe(LeaveRequestStatus.CANCELLED);
    });

    it('should return 403 on employee mismatch', async () => {
      mockService.cancelLeaveRequest.mockRejectedValue(
        new Error('Employee mismatch: request belongs to emp-1, not emp-2'),
      );

      const response = await app.inject({
        method: 'POST',
        url: '/api/leave/requests/lr-1/cancel',
        headers: {
          'x-user-id': 'emp-2',
        },
      });

      expect(response.statusCode).toBe(403);
    });
  });
});
