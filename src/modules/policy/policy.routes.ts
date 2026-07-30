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
      return reply.type('application/json').send(policies);
    } catch (error) {
      request.log.error(error);
      return reply.status(500).type('application/json').send({ error: 'Oops! Something went wrong on our end.' });
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
          return reply.status(404).type('application/json').send({ error: 'Hmm, we couldn’t find that policy.' });
        }
        return reply.type('application/json').send(policy);
      } catch (error) {
        request.log.error(error);
        return reply.status(500).type('application/json').send({ error: 'Oops! Something went wrong on our end.' });
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
          return reply.status(400).type('application/json').send({ error: 'That leave type doesn’t look right.' });
        }
        const policy = await service.getByLeaveType(leaveType as LeaveType);
        if (!policy) {
          return reply
            .status(404)
            .type('application/json')
            .send({ error: 'No policy found for that leave type, sorry.' });
        }
        return reply.type('application/json').send(policy);
      } catch (error) {
        request.log.error(error);
        return reply.status(500).type('application/json').send({ error: 'Oops! Something went wrong on our end.' });
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
          .type('application/json')
          .send({
            error:
              'Hey, you’re missing required fields: policyName, leaveType, entitlementDays',
          });
      }
      const created = await service.createPolicy(data);
      return reply.status(201).type('application/json').send(created);
    } catch (error) {
      request.log.error(error);
      return reply.status(500).type('application/json').send({ error: 'Oops! Something went wrong on our end.' });
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
        return reply.status(404).type('application/json').send({ error: 'Hmm, we couldn’t find that policy.' });
      }
      return reply.type('application/json').send(updated);
    } catch (error) {
      request.log.error(error);
      return reply.status(500).type('application/json').send({ error: 'Oops! Something went wrong on our end.' });
    }
  });
}
