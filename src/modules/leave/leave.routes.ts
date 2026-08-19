import { FastifyInstance } from 'fastify';
import { LeaveService, ValidationError } from './leave.service';
import { ILeaveRequestRepository } from './leave.repository';
import { LeaveRequest, LeaveRequestQueryParams, CreateLeaveRequestDto } from './leave.model';
import { LeaveRequestStatus, LeaveType, AuditAction } from '../../shared/types/index';
import { IEmployeeService } from '../employee/index';
import { ILeavePolicyService } from '../policy/index';
import { IBalanceService } from '../balance/index';
import { BalanceStatus } from '../balance/index';
import { IAuditService } from '../audit/index';

function createInMemoryLeaveRepo(): ILeaveRequestRepository {
  const store = new Map<string, LeaveRequest>();

  return {
    async findById(id: string): Promise<LeaveRequest | null> {
      return store.get(id) ?? null;
    },
    async findByEmployee(employeeId: string): Promise<LeaveRequest[]> {
      return Array.from(store.values()).filter((r) => r.employeeId === employeeId);
    },
    async findByStatus(status: LeaveRequestStatus): Promise<LeaveRequest[]> {
      return Array.from(store.values()).filter((r) => r.status === status);
    },
    async findByDateRange(start: Date, end: Date): Promise<LeaveRequest[]> {
      return Array.from(store.values()).filter(
        (r) => r.startDate <= end && r.endDate >= start,
      );
    },
    async query(params: LeaveRequestQueryParams): Promise<LeaveRequest[]> {
      let results = Array.from(store.values());
      if (params.status) {
        results = results.filter((r) => r.status === params.status);
      }
      if (params.employeeId) {
        results = results.filter((r) => r.employeeId === params.employeeId);
      }
      if (params.startDate) {
        results = results.filter((r) => r.endDate >= params.startDate!);
      }
      if (params.endDate) {
        results = results.filter((r) => r.startDate <= params.endDate!);
      }
      return results;
    },
    async create(
      request: Omit<LeaveRequest, 'id' | 'createdAt' | 'updatedAt'>,
    ): Promise<LeaveRequest> {
      const now = new Date();
      const id = `lr-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const created: LeaveRequest = { ...request, id, createdAt: now, updatedAt: now };
      store.set(id, created);
      return created;
    },
    async update(id: string, data: Partial<LeaveRequest>): Promise<LeaveRequest | null> {
      const existing = store.get(id);
      if (!existing) return null;
      const updated: LeaveRequest = { ...existing, ...data, id: existing.id };
      store.set(id, updated);
      return updated;
    },
    async delete(id: string): Promise<boolean> {
      return store.delete(id);
    },
  };
}

function createStubEmployeeService(): IEmployeeService {
  return {
    getById: async () => ({
      id: 'stub-emp',
      fullName: 'Stub Employee',
      email: 'stub@example.com',
      department: null,
      managerId: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    getAll: async () => [],
    getSubordinates: async () => [],
    create: async () => {
      throw new Error('Not implemented in stub');
    },
    update: async () => null,
    deactivate: async () => false,
  };
}

function createStubPolicyService(): ILeavePolicyService {
  return {
    getById: async () => ({
      id: 'stub-policy',
      policyName: 'Stub Policy',
      leaveType: LeaveType.ANNUAL,
      entitlementDays: 20,
      accrualRate: null,
      maxAccumulation: null,
      minimumNoticeDays: null,
      requiresManagerApproval: true,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    getAll: async () => [],
    getByLeaveType: async () => [],
    getActive: async () => [],
    create: async () => {
      throw new Error('Not implemented in stub');
    },
    update: async () => null,
    deactivate: async () => false,
  };
}

function createStubBalanceService(): IBalanceService {
  return {
    getById: async () => null,
    getByEmployee: async () => [],
    getByEmployeeAndPolicy: async () => ({
      id: 'stub-balance',
      employeeId: 'stub-emp',
      leavePolicyId: 'stub-policy',
      totalEntitlement: 20,
      usedDays: 0,
      remainingDays: 20,
      fiscalYear: 2026,
      status: BalanceStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    create: async () => {
      throw new Error('Not implemented in stub');
    },
    deductDays: async () => ({
      id: 'stub-balance',
      employeeId: 'stub-emp',
      leavePolicyId: 'stub-policy',
      totalEntitlement: 20,
      usedDays: 5,
      remainingDays: 15,
      fiscalYear: 2026,
      status: BalanceStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    restoreDays: async () => ({
      id: 'stub-balance',
      employeeId: 'stub-emp',
      leavePolicyId: 'stub-policy',
      totalEntitlement: 20,
      usedDays: 0,
      remainingDays: 20,
      fiscalYear: 2026,
      status: BalanceStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    hasSufficientBalance: async () => true,
  };
}

function createStubAuditService(): IAuditService {
  return {
    log: async () => ({
      id: 'stub-audit',
      entityType: 'LeaveRequest',
      entityId: 'stub',
      action: AuditAction.CREATED,
      performedBy: 'stub',
      changes: null,
      timestamp: new Date(),
      createdAt: new Date(),
    }),
    getEntityHistory: async () => [],
    getUserActions: async () => [],
    getByDateRange: async () => [],
  };
}

export async function leaveRoutes(fastify: FastifyInstance): Promise<void> {
  const leaveRepo = createInMemoryLeaveRepo();
  const employeeService = createStubEmployeeService();
  const policyService = createStubPolicyService();
  const balanceService = createStubBalanceService();
  const auditService = createStubAuditService();

  function makeService(): LeaveService {
    return new LeaveService(
      leaveRepo,
      employeeService,
      policyService,
      balanceService,
      auditService,
    );
  }

  fastify.post('/leave', async (request, reply) => {
    try {
      const service = makeService();
      const result = await service.create(request.body as CreateLeaveRequestDto);
      return reply.status(201).send(result);
    } catch (error) {
      if (error instanceof ValidationError) {
        return reply.status(400).send({ error: error.message });
      }
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  fastify.post('/leave/:id/submit', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const service = makeService();
      const result = await service.submit(id);
      return reply.status(200).send(result);
    } catch (error) {
      if (error instanceof ValidationError) {
        return reply.status(400).send({ error: error.message });
      }
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  fastify.post('/leave/:id/approve', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = request.body as { approverId?: string } | null;
      const approverId = body?.approverId ?? 'unknown';
      const service = makeService();
      const result = await service.approve(id, approverId);
      return reply.status(200).send(result);
    } catch (error) {
      if (error instanceof ValidationError) {
        return reply.status(400).send({ error: error.message });
      }
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  fastify.post('/leave/:id/reject', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = request.body as { rejectorId?: string; reason?: string } | null;
      const rejectorId = body?.rejectorId ?? 'unknown';
      const reason = body?.reason ?? '';
      const service = makeService();
      const result = await service.reject(id, rejectorId, reason);
      return reply.status(200).send(result);
    } catch (error) {
      if (error instanceof ValidationError) {
        return reply.status(400).send({ error: error.message });
      }
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  fastify.post('/leave/:id/cancel', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = request.body as { cancelledBy?: string; reason?: string } | null;
      const cancelledBy = body?.cancelledBy ?? 'unknown';
      const reason = body?.reason ?? '';
      const service = makeService();
      const result = await service.cancel(id, cancelledBy, reason);
      return reply.status(200).send(result);
    } catch (error) {
      if (error instanceof ValidationError) {
        return reply.status(400).send({ error: error.message });
      }
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  fastify.get('/leave/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const service = makeService();
      const result = await service.getById(id);
      if (!result) {
        return reply.status(404).send({ error: 'Leave request not found' });
      }
      return reply.status(200).send(result);
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  fastify.get('/leave', async (request, reply) => {
    try {
      const query = request.query as LeaveRequestQueryParams;
      const service = makeService();
      const result = await service.query(query);
      return reply.status(200).send(result);
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });
}
