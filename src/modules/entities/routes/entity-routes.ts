import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { EntityService } from '../service/entity-service';
import { auditLog } from '../../../shared/utils/audit-log';

const entitySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string()
});

export async function entityRoutes(fastify: FastifyInstance, service: EntityService): Promise<void> {
  fastify.post('/entities', {
    preHandler: [fastify.authenticate, fastify.authorize],
    schema: { body: entitySchema }
  }, async (request, reply) => {
    const entity = request.body;
    await service.createEntity(entity);
    await auditLog.append('Entity created', { entity });
    reply.code(201).send();
  });

  fastify.patch('/entities/:id', {
    preHandler: [fastify.authenticate, fastify.authorize],
    schema: { body: entitySchema.partial() }
  }, async (request, reply) => {
    const { id } = request.params;
    const entity = { ...request.body, id };
    await service.updateEntity(entity);
    await auditLog.append('Entity updated', { entity });
    reply.code(204).send();
  });

  fastify.delete('/entities/:id', {
    preHandler: [fastify.authenticate, fastify.authorize]
  }, async (request, reply) => {
    const { id } = request.params;
    await service.deleteEntity(id);
    await auditLog.append('Entity deleted', { id });
    reply.code(204).send();
  });
}