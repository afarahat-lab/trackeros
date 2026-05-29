import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { EntitiesService } from '../service/entities-service';
import { auditLog } from '../../shared/utils/audit-log';
import { authMiddleware } from '../../shared/auth/auth-middleware';

const createEntitySchema = z.object({
  name: z.string(),
  description: z.string().optional()
});

export async function entitiesRoutes(fastify: FastifyInstance) {
  const service = new EntitiesService(new EntitiesRepository());

  fastify.get('/api/v1/entities', {
    preHandler: authMiddleware(['admin', 'operator']),
    handler: async (request, reply) => {
      const entities = await service.getAllEntities();
      reply.send({ entities });
    }
  });

  fastify.post('/api/v1/entities', {
    preHandler: authMiddleware(['admin']),
    handler: async (request, reply) => {
      const validation = createEntitySchema.safeParse(request.body);
      if (!validation.success) {
        reply.status(400).send(validation.error);
        return;
      }

      const entity = await service.createEntity(validation.data);
      await auditLog.append({
        action: 'create',
        entityName: 'Entity',
        entityId: entity.id,
        metadata: { name: entity.name }
      });
      reply.status(201).send({ entity });
    }
  });
}
