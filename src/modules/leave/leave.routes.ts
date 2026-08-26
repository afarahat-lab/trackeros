import { FastifyInstance } from 'fastify';
import { LeaveService } from './leave.service';
import { CreateLeaveRequestDto, LeaveRequestQueryParams } from './leave.model';
import { ILeaveRequestRepository } from './leave.repository.interface';
import { IBalanceRepository } from '../balance/balance.repository.interface';
import { IAuditRepository } from '../audit/audit.repository.interface';
import { IPolicyRepository } from '../policy/policy.repository.interface';

export async function leaveRoutes(fastify: FastifyInstance): Promise<void> {
  const leaveService = new LeaveService(
    {} as unknown as ILeaveRequestRepository,
    {} as unknown as IBalanceRepository,
    {} as unknown as IAuditRepository,
    {} as unknown as IPolicyRepository,
  );

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
      const params: LeaveRequestQueryParams = {};
      if (query.employeeId) params.employeeId = query.employeeId;
      if (query.status) params.status = query.status as LeaveRequestQueryParams['status'];
      if (query.startDate) params.startDate = new Date(query.startDate);
      if (query.endDate) params.endDate = new Date(query.endDate);
      const result = await leaveService.query(params);
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
