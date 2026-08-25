import { FastifyInstance } from 'fastify';
import { LeaveService } from './leave.service';
import { CreateLeaveRequestDto, LeaveRequest, LeaveRequestQueryParams } from './leave.model';
import { ILeaveRequestRepository } from './leave.repository.interface';
import { IBalanceRepository } from 'modules/balance/balance.repository.interface';
import { IAuditRepository } from 'modules/audit/audit.repository.interface';
import { IPolicyRepository } from 'modules/policy/policy.repository.interface';
import { LeaveStatus, LeaveType } from 'shared/types';
import { LeaveBalance } from 'modules/balance/balance.model';
import { LeavePolicy } from 'modules/policy/policy.model';
import { AuditRecord } from 'modules/audit/audit.model';

export async function leaveRoutes(fastify: FastifyInstance): Promise<void> {
  const leaveRepoStub: ILeaveRequestRepository = {
    findById: (_id: string) => Promise.resolve(null),
    findByEmployee: (_employeeId: string, _queryParams?: LeaveRequestQueryParams) => Promise.resolve([] as LeaveRequest[]),
    findApprovedOverlapping: (_employeeId: string, _startDate: Date, _endDate: Date, _excludeRequestId?: string) => Promise.resolve([] as LeaveRequest[]),
    create: (request: Omit<LeaveRequest, 'id' | 'createdAt' | 'updatedAt'>) =>
      Promise.resolve({ id: 'stub-id', ...request, createdAt: new Date(), updatedAt: new Date() }),
    update: (id: string, data: Partial<LeaveRequest>) =>
      Promise.resolve({ id, ...data, createdAt: new Date(), updatedAt: new Date() } as LeaveRequest),
    updateStatus: (id: string, status: LeaveStatus, _approvedBy?: string | null, _approvedAt?: Date | null) =>
      Promise.resolve({ id, status, createdAt: new Date(), updatedAt: new Date() } as LeaveRequest),
  };

  const balanceRepoStub: IBalanceRepository = {
    findById: (_id: string) => Promise.resolve(null),
    findByEmployeeAndYear: (_employeeId: string, _year: number) => Promise.resolve([] as LeaveBalance[]),
    findByEmployeePolicyAndYear: (_employeeId: string, _policyId: string, _year: number) => Promise.resolve(null),
    create: (balance: Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt'>) =>
      Promise.resolve({ id: 'stub-balance-id', ...balance, createdAt: new Date(), updatedAt: new Date() }),
    updateCounters: (id: string, usedDays: number, pendingDays: number) =>
      Promise.resolve({ id, usedDays, pendingDays, createdAt: new Date(), updatedAt: new Date() } as LeaveBalance),
    getOrCreateForYear: (employeeId: string, policyId: string, year: number, entitlementDays: number) =>
      Promise.resolve({
        id: 'stub-balance-id',
        employeeId,
        policyId,
        entitlementDays,
        usedDays: 0,
        pendingDays: 0,
        year,
        status: 'ACTIVE' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
  };

  const auditRepoStub: IAuditRepository = {
    create: (record: Omit<AuditRecord, 'id' | 'createdAt'>) =>
      Promise.resolve({ id: 'stub-audit-id', ...record, createdAt: new Date() }),
    findByEntity: (_entityType: string, _entityId: string) => Promise.resolve([] as AuditRecord[]),
    findByPerformer: (_performedBy: string, _limit?: number) => Promise.resolve([] as AuditRecord[]),
    findByDateRange: (_startDate: Date, _endDate: Date) => Promise.resolve([] as AuditRecord[]),
  };

  const policyRepoStub: IPolicyRepository = {
    findById: (_id: string) => Promise.resolve(null),
    findByLeaveType: (_leaveType: LeaveType) => Promise.resolve([] as LeavePolicy[]),
    findActive: () => Promise.resolve([] as LeavePolicy[]),
    findActiveByLeaveType: (_leaveType: LeaveType) => Promise.resolve(null),
    create: (policy: Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>) =>
      Promise.resolve({ id: 'stub-policy-id', ...policy, createdAt: new Date(), updatedAt: new Date() }),
    update: (id: string, data: Partial<LeavePolicy>) =>
      Promise.resolve({ id, ...data, createdAt: new Date(), updatedAt: new Date() } as LeavePolicy),
  };

  const leaveService = new LeaveService(leaveRepoStub, balanceRepoStub, auditRepoStub, policyRepoStub);

  fastify.post('/leave', async (request, reply) => {
    try {
      const dto = request.body as CreateLeaveRequestDto;
      const result = await leaveService.submit(dto);
      return reply.status(201).send(result);
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  fastify.get('/leave/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const result = await leaveService.getById(id);
      if (!result) return reply.status(404).send({ error: 'Not Found' });
      return reply.status(200).send(result);
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  fastify.get('/leave', async (request, reply) => {
    try {
      const query = request.query as Record<string, string>;
      const params: Record<string, unknown> = {};
      if (query.employeeId) params.employeeId = query.employeeId;
      if (query.status) params.status = query.status;
      if (query.startDate) params.startDate = new Date(query.startDate);
      if (query.endDate) params.endDate = new Date(query.endDate);
      const result = await leaveService.query(params as never);
      return reply.status(200).send(result);
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  fastify.post('/leave/:id/approve', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { approverId } = request.body as { approverId: string };
      const result = await leaveService.approve(id, approverId);
      return reply.status(200).send(result);
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  fastify.post('/leave/:id/reject', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { rejectorId } = request.body as { rejectorId: string };
      const result = await leaveService.reject(id, rejectorId);
      return reply.status(200).send(result);
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  fastify.post('/leave/:id/cancel', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { employeeId } = request.body as { employeeId: string };
      const result = await leaveService.cancel(id, employeeId);
      return reply.status(200).send(result);
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });
}
