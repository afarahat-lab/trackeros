import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { EntitiesService } from '../service/entities-service';

const entitySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional()
});

export async function registerEntityRoutes(fastify: FastifyInstance, service: EntitiesService): Promise<void> {
  fastify.post('/entities', {
    preHandler: [fastify.auth],
    schema: { body: entitySchema }
  }, async (request, reply) => {
    const entity = entitySchema.parse(request.body);
    const createdEntity = await service.createEntity(entity);
    await fastify.auditLog.append({ action: 'create', entity: 'Entity', entityId: createdEntity.id });
    reply.send(createdEntity);
  });

  fastify.get('/entities/:id', {
    preHandler: [fastify.auth]
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const entity = await service.findEntityById(id);
    if (!entity) {
      reply.status(404).send({ message: 'Entity not found' });
      return;
    }
    reply.send(entity);
  });

  fastify.put('/entities/:id', {
    preHandler: [fastify.auth],
    schema: { body: entitySchema }
  }, async (request, reply) => {
    const entity = entitySchema.parse(request.body);
    const updatedEntity = await service.updateEntity(entity);
    await fastify.auditLog.append({ action: 'update', entity: 'Entity', entityId: updatedEntity.id });
    reply.send(updatedEntity);
  });

  fastify.delete('/entities/:id', {
    preHandler: [fastify.auth]
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await service.deleteEntity(id);
    await fastify.auditLog.append({ action: 'delete', entity: 'Entity', entityId: id });
    reply.status(204).send();
  });
}