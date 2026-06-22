import { registerLeaveRoutes } from '../../../src/modules/leave/leave.routes';
import { LeaveController } from '../../../src/modules/leave/leave.controller';
import { LeaveService } from '../../../src/modules/leave/leave.service';
import { BalanceService } from '../../../src/modules/balance/balance.service';
import { LeaveRequestStatus } from '../../../src/modules/leave/leave.model';

// Mock Fastify instance to simulate routing and inject method without requiring the fastify package
class MockFastify {
  routes: any[] = [];
  authenticate = jest.fn();
  authorize = jest.fn();

  post(path: string, opts: any, handler: any) { this.routes.push({ method: 'POST', path, handler }); }
  put(path: string, opts: any, handler: any) { this.routes.push({ method: 'PUT', path, handler }); }
  get(path: string, opts: any, handler: any) { this.routes.push({ method: 'GET', path, handler }); }

  async inject(opts: { method: string, url: string, payload?: any, headers?: any }) {
    const method = opts.method.toUpperCase();
    const url = new URL(opts.url, 'http://localhost');
    const pathname = url.pathname;
    
    // Sort routes: static paths first, then parametric (mimics Fastify priority)
    const sortedRoutes = [...this.routes].sort((a, b) => {
      const aParams = (a.path.match(/:/g) || []).length;
      const bParams = (b.path.match(/:/g) || []).length;
      return aParams - bParams;
    });

    const route = sortedRoutes.find(r => {
      if (r.method !== method) return false;
      const routeParts = r.path.split('/');
      const urlParts = pathname.split('/');
      if (routeParts.length !== urlParts.length) return false;
      return routeParts.every((part: string, i: number) => {
        if (part.startsWith(':')) return urlParts[i] !== '';
        return part === urlParts[i];
      });
    });

    if (!route) {
      return { statusCode: 404, json: () => ({ error: 'Not Found' }), payload: '{"error":"Not Found"}' };
    }

    const params: any = {};
    const routeParts = route.path.split('/');
    const urlParts = pathname.split('/');
    routeParts.forEach((part: string, i: number) => {
      if (part.startsWith(':')) params[part.substring(1)] = urlParts[i];
    });

    const query: any = {};
    url.searchParams.forEach((value, key) => { query[key] = value; });

    const request = {
      user: { id: 'user-1', role: 'employee' },
      body: opts.payload,
      params,
      query,
    };

    let statusCode = 200;
    let payload: any = null;

    const reply = {
      code: (code: number) => { statusCode = code; return reply; },
      send: (data: any) => { payload = data; return reply; }
    };

    await route.handler(request, reply);

    return {
      statusCode,
      json: () => payload,
      payload: JSON.stringify(payload)
    };
  }
}

describe('Leave API Integration', () => {
  let fastify: MockFastify;
  let leaveService: jest.Mocked<any>;
  let balanceService: jest.Mocked<any>;

  beforeEach(() => {
    fastify = new MockFastify();
    
    leaveService = {
      applyLeave: jest.fn(),
      approveLeave: jest.fn(),
      rejectLeave: jest.fn(),
      cancelLeave: jest.fn(),
      getLeaveRequest: jest.fn(),
      getLeaveRequests: jest.fn(),
    };

    balanceService = {
      getBalance: jest.fn(),
    };

    const controller = new LeaveController(leaveService as any, balanceService as any);
    registerLeaveRoutes(fastify as any, controller);
  });

  it('POST /apply should create a leave request', async () => {
    const dto = { leaveTypeId: 'lt-1', startDate: '2023-10-01', endDate: '2023-10-02', daysRequested: 2 };
    const mockLeave = { id: 'l-1', ...dto, status: LeaveRequestStatus.SUBMITTED };
    leaveService.applyLeave.mockResolvedValue(mockLeave);

    const res = await fastify.inject({ method: 'POST', url: '/apply', payload: dto });

    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual(mockLeave);
    expect(leaveService.applyLeave).toHaveBeenCalledWith('user-1', dto);
  });

  it('PUT /approve/:id should approve a leave request', async () => {
    const mockLeave = { id: 'l-1', status: LeaveRequestStatus.APPROVED };
    leaveService.approveLeave.mockResolvedValue(mockLeave);

    const res = await fastify.inject({ method: 'PUT', url: '/approve/l-1' });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(mockLeave);
    expect(leaveService.approveLeave).toHaveBeenCalledWith('l-1', 'user-1');
  });

  it('PUT /reject/:id should reject a leave request', async () => {
    const mockLeave = { id: 'l-1', status: LeaveRequestStatus.REJECTED };
    leaveService.rejectLeave.mockResolvedValue(mockLeave);

    const res = await fastify.inject({ method: 'PUT', url: '/reject/l-1', payload: { reason: 'Not enough staff' } });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(mockLeave);
    expect(leaveService.rejectLeave).toHaveBeenCalledWith('l-1', 'user-1', 'Not enough staff');
  });

  it('PUT /cancel/:id should cancel a leave request', async () => {
    const mockLeave = { id: 'l-1', status: LeaveRequestStatus.CANCELLED };
    leaveService.cancelLeave.mockResolvedValue(mockLeave);

    const res = await fastify.inject({ method: 'PUT', url: '/cancel/l-1' });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(mockLeave);
    expect(leaveService.cancelLeave).toHaveBeenCalledWith('l-1', 'user-1');
  });

  it('GET /:id should get a leave request', async () => {
    const mockLeave = { id: 'l-1' };
    leaveService.getLeaveRequest.mockResolvedValue(mockLeave);

    const res = await fastify.inject({ method: 'GET', url: '/l-1' });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(mockLeave);
    expect(leaveService.getLeaveRequest).toHaveBeenCalledWith('l-1');
  });

  it('GET / should get leave requests', async () => {
    const mockLeaves = [{ id: 'l-1' }];
    leaveService.getLeaveRequests.mockResolvedValue(mockLeaves);

    const res = await fastify.inject({ method: 'GET', url: '/?status=approved' });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(mockLeaves);
    expect(leaveService.getLeaveRequests).toHaveBeenCalledWith({ status: 'approved' });
  });

  it('GET /balance should get leave balance', async () => {
    const mockBalance = { totalDays: 20, usedDays: 5 };
    balanceService.getBalance.mockResolvedValue(mockBalance);

    const res = await fastify.inject({ method: 'GET', url: '/balance?leaveTypeId=lt-1&year=2023' });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(mockBalance);
    expect(balanceService.getBalance).toHaveBeenCalledWith('user-1', 'lt-1', '2023');
  });
});
