import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { EntitiesService } from '../service/entities-service';
import { auditLog } from '../../shared/utils/audit-log';

const entitySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional()
});

/**
 * Registers entity routes.
 * @param server - The Fastify instance.
 */
export async function registerEntityRoutes(server: FastifyInstance): Promise<void> {
  const service = new EntitiesService();

  server.post('/api/v1/entities', {
    preHandler: [server.auth],
    schema: {
      body: entitySchema
    }
  }, async (request, reply) => {
    const entity = entitySchema.parse(request.body);
    const createdEntity = await service.createEntity(entity);
    await auditLog.append('Entity created', { entityId: createdEntity.id });
    reply.send(createdEntity);
  });
}