import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { AgentsService } from '../service/agents-service';
import { auditLog } from '../../../shared/utils/audit-log';

const updateAgentSchema = z.object({
  agentId: z.string(),
  principle: z.string()
});

export function registerAgentRoutes(app: FastifyInstance, service: AgentsService): void {
  app.put('/agents/:id/documentation', {
    preHandler: [app.authenticate, app.authorize],
    schema: {
      body: updateAgentSchema
    }
  }, async (request, reply) => {
    const { agentId, principle } = updateAgentSchema.parse(request.body);
    await service.updateAgentDocumentation(agentId, principle);
    await auditLog.append({ action: 'update', entity: 'agent', entityId: agentId });
    reply.send({ success: true });
  });
}