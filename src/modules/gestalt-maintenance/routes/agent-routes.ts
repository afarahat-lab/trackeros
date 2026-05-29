import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { AgentService } from '../service/agent-service';
import { auditLog } from '../../../shared/utils/audit-log';

const agentSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string()
});

export async function agentRoutes(fastify: FastifyInstance) {
  fastify.put('/agents/:id', {
    preHandler: [fastify.authenticate, fastify.authorize],
    schema: { body: agentSchema }
  }, async (request, reply) => {
    const agentService = new AgentService(new AgentRepository());
    const agentData = agentSchema.parse(request.body);

    await agentService.updateAgent(agentData);
    await auditLog.append({ action: 'update', entity: 'agent', entityId: agentData.id });

    reply.send({ success: true });
  });
}