import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PgLeavePolicyRepository } from './policy.repository';
import { PolicyService } from './policy.service';
import { LeavePolicy } from './policy.model';
import { LeaveType } from '../../shared/types/index';

export async function policyRoutes(app: FastifyInstance) {
  const repository = new PgLeavePolicyRepository();
  const service = new PolicyService(repository);

  // GET /policies – list all active policies
  app.get('/policies', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const policies = await service.getAllActive();
      return reply.send(policies);
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  // GET /policies/:id
  app.get<{ Params: { id: string } }>(
    '/policies/:id',
    async (request, reply) => {
      try {
        const { id } = request.params;
        const policy = await service.getById(id);
        if (!policy) {
          return reply.status(404).send({ error: 'Policy not found' });
        }
        return reply.send(policy);
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Internal Server Error' });
      }
    }
  );

  // GET /policies/type/:leaveType
  app.get<{ Params: { leaveType: string } }>(
    '/policies/type/:leaveType',
    async (request, reply) => {
      try {
        const { leaveType } = request.params;
        if (!Object.values(LeaveType).includes(leaveType as LeaveType)) {
          return reply.status(400).send({ error: 'Invalid leave type' });
        }
        const policy = await service.getByLeaveType(leaveType as LeaveType);
        if (!policy) {
          return reply
            .status(404)
            .send({ error: 'Policy not found for this leave type' });
        }
        return reply.send(policy);
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Internal Server Error' });
      }
    }
  );

  // POST /policies
  app.post<{
    Body: Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>;
  }>('/policies', async (request, reply) => {
    try {
      const data = request.body;
      if (!data.policyName || !data.leaveType || data.entitlementDays == null) {
        return reply
          .status(400)
          .send({
            error:
              'Missing required fields: policyName, leaveType, entitlementDays',
          });
      }
      const created = await service.createPolicy(data);
      return reply.status(201).send(created);
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  // PUT /policies/:id
  app.put<{
    Params: { id: string };
    Body: Partial<LeavePolicy>;
  }>('/policies/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const data = request.body;
      const updated = await service.updatePolicy(id, data);
      if (!updated) {
        return reply.status(404).send({ error: 'Policy not found' });
      }
      return reply.send(updated);
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });
}
