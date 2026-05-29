import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { AgentsService } from '../service/agents-service';
import { auditLog } from '../../../shared/utils/audit-log';
import { rbacMiddleware } from '../../../shared/auth/rbac-middleware';

const updateAgentsSchema = z.object({
  correlationId: z.string().uuid(),
});

/**
 * Registers agent-related routes.
 * @param server - The Fastify server instance.
 */
export async function registerAgentsRoutes(server: FastifyInstance): Promise<void> {
  const service = new AgentsService(new AgentsRepository());

  server.put('/agents/documentation', {
    preHandler: [rbacMiddleware],
    schema: {
      body: updateAgentsSchema,
    },
    handler: async (request, reply) => {
      const { correlationId } = request.body;
      await service.updateAgentsDocumentation();
      await auditLog.append({
        action: 'update_agents_documentation',
        correlationId,
      });
      reply.status(204).send();
    },
  });
}