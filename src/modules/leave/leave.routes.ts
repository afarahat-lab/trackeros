import { FastifyInstance } from 'fastify';
import { LeaveService } from './leave.service';
import { ILeaveService } from './leave.service.interface';
import { ILeaveRequestRepository } from './leave.repository';
import { IEmployeeService } from '../employee/employee.service.interface';
import { ILeavePolicyService } from '../policy/policy.service.interface';
import { IBalanceService } from '../balance/balance.service.interface';
import { IAuditService } from '../audit/audit.service.interface';
import { LeaveRequestStatus } from '../../shared/types/index';

export interface LeaveRoutesDependencies {
  leaveRequestRepository: ILeaveRequestRepository;
  employeeService: IEmployeeService;
  leavePolicyService: ILeavePolicyService;
  balanceService: IBalanceService;
  auditService: IAuditService;
}

function createService(deps: LeaveRoutesDependencies): ILeaveService {
  return new LeaveService(
    deps.leaveRequestRepository,
    deps.employeeService,
    deps.leavePolicyService,
    deps.balanceService,
    deps.auditService,
  );
}

export async function leaveRoutes(
  fastify: FastifyInstance,
  deps: LeaveRoutesDependencies,
): Promise<void> {
  fastify.post('/leave', async (request, reply) => {
    try {
      const service = createService(deps);
      const body = request.body as Record<string, unknown> | undefined;
      if (!body || typeof body !== 'object') {
        return reply.status(422).send({ error: 'Request body is required' });
      }
      const result = await service.create({
        employeeId: String(body.employeeId ?? ''),
        leavePolicyId: String(body.leavePolicyId ?? ''),
        startDate: new Date(String(body.startDate ?? '')),
        endDate: new Date(String(body.endDate ?? '')),
        reason: body.reason != null ? String(body.reason) : undefined,
      });
      return reply.status(201).send(result);
    } catch (error: unknown) {
      request.log.error(error);
      if (error instanceof Error) {
        const name = (error as Error & { name: string }).name;
        if (name === 'ValidationError') {
          return reply.status(422).send({ error: error.message });
        }
        if (name === 'NotFoundError') {
          return reply.status(404).send({ error: error.message });
        }
        if (name === 'ConflictError') {
          return reply.status(409).send({ error: error.message });
        }
      }
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  fastify.post('/leave/:id/submit', async (request, reply) => {
    try {
      const service = createService(deps);
      const params = request.params as Record<string, string>;
      const result = await service.submit(params.id);
      return reply.status(200).send(result);
    } catch (error: unknown) {
      request.log.error(error);
      if (error instanceof Error) {
        const name = (error as Error & { name: string }).name;
        if (name === 'ValidationError') {
          return reply.status(422).send({ error: error.message });
        }
        if (name === 'NotFoundError') {
          return reply.status(404).send({ error: error.message });
        }
        if (name === 'ConflictError') {
          return reply.status(409).send({ error: error.message });
        }
      }
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  fastify.post('/leave/:id/approve', async (request, reply) => {
    try {
      const service = createService(deps);
      const params = request.params as Record<string, string>;
      const body = request.body as Record<string, unknown> | undefined;
      const approverId = body && typeof body.approverId === 'string' ? body.approverId : '';
      const result = await service.approve(params.id, approverId);
      return reply.status(200).send(result);
    } catch (error: unknown) {
      request.log.error(error);
      if (error instanceof Error) {
        const name = (error as Error & { name: string }).name;
        if (name === 'ValidationError') {
          return reply.status(422).send({ error: error.message });
        }
        if (name === 'NotFoundError') {
          return reply.status(404).send({ error: error.message });
        }
        if (name === 'ConflictError') {
          return reply.status(409).send({ error: error.message });
        }
      }
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  fastify.post('/leave/:id/reject', async (request, reply) => {
    try {
      const service = createService(deps);
      const params = request.params as Record<string, string>;
      const body = request.body as Record<string, unknown> | undefined;
      const rejectorId = body && typeof body.rejectorId === 'string' ? body.rejectorId : '';
      const reason = body && typeof body.reason === 'string' ? body.reason : '';
      const result = await service.reject(params.id, rejectorId, reason);
      return reply.status(200).send(result);
    } catch (error: unknown) {
      request.log.error(error);
      if (error instanceof Error) {
        const name = (error as Error & { name: string }).name;
        if (name === 'ValidationError') {
          return reply.status(422).send({ error: error.message });
        }
        if (name === 'NotFoundError') {
          return reply.status(404).send({ error: error.message });
        }
        if (name === 'ConflictError') {
          return reply.status(409).send({ error: error.message });
        }
      }
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  fastify.post('/leave/:id/cancel', async (request, reply) => {
    try {
      const service = createService(deps);
      const params = request.params as Record<string, string>;
      const body = request.body as Record<string, unknown> | undefined;
      const cancelledBy = body && typeof body.cancelledBy === 'string' ? body.cancelledBy : '';
      const reason = body && typeof body.reason === 'string' ? body.reason : '';
      const result = await service.cancel(params.id, cancelledBy, reason);
      return reply.status(200).send(result);
    } catch (error: unknown) {
      request.log.error(error);
      if (error instanceof Error) {
        const name = (error as Error & { name: string }).name;
        if (name === 'ValidationError') {
          return reply.status(422).send({ error: error.message });
        }
        if (name === 'NotFoundError') {
          return reply.status(404).send({ error: error.message });
        }
        if (name === 'ConflictError') {
          return reply.status(409).send({ error: error.message });
        }
      }
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  fastify.get('/leave/:id', async (request, reply) => {
    try {
      const service = createService(deps);
      const params = request.params as Record<string, string>;
      const result = await service.getById(params.id);
      if (!result) {
        return reply.status(404).send({ error: 'LeaveRequest not found' });
      }
      return reply.status(200).send(result);
    } catch (error: unknown) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  fastify.get('/leave', async (request, reply) => {
    try {
      const service = createService(deps);
      const query = request.query as Record<string, unknown> | undefined;
      const statusValue = query?.status as string | undefined;
      const result = await service.query({
        status: statusValue && Object.values(LeaveRequestStatus).includes(statusValue as LeaveRequestStatus)
          ? (statusValue as LeaveRequestStatus)
          : undefined,
        employeeId: query?.employeeId as string | undefined,
        startDate: query?.startDate ? new Date(String(query.startDate)) : undefined,
        endDate: query?.endDate ? new Date(String(query.endDate)) : undefined,
      });
      return reply.status(200).send(result);
    } catch (error: unknown) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });
}
