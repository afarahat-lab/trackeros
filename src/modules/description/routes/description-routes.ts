import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { DescriptionService } from '../service/description-service';
import { auditLog } from '../../../shared/utils/audit-log';
import { authenticate, authorize } from '../../../shared/auth/middleware';

const descriptionSchema = z.object({
  text: z.string()
});

export async function descriptionRoutes(fastify: FastifyInstance, service: DescriptionService): Promise<void> {
  fastify.post('/api/v1/descriptions', {
    preHandler: [authenticate, authorize(['admin', 'operator'])]
  }, async (request, reply) => {
    const { text } = descriptionSchema.parse(request.body);
    const description = await service.createDescription(text);
    await auditLog.append({ action: 'create', entity: 'description', entityId: description.id });
    reply.send(description);
  });

  fastify.get('/api/v1/descriptions', {
    preHandler: [authenticate, authorize(['admin', 'operator'])]
  }, async (_request, reply) => {
    const descriptions = await service.getAllDescriptions();
    reply.send({ descriptions });
  });

  fastify.get('/api/v1/descriptions/:id', {
    preHandler: [authenticate, authorize(['admin', 'operator'])]
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const description = await service.getDescriptionById(id);
    if (!description) {
      reply.status(404).send({ message: 'Description not found' });
      return;
    }
    reply.send(description);
  });

  fastify.put('/api/v1/descriptions/:id', {
    preHandler: [authenticate, authorize(['admin', 'operator'])]
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { text } = descriptionSchema.parse(request.body);
    const description = await service.updateDescription(id, text);
    await auditLog.append({ action: 'update', entity: 'description', entityId: description.id });
    reply.send(description);
  });

  fastify.delete('/api/v1/descriptions/:id', {
    preHandler: [authenticate, authorize(['admin', 'operator'])]
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const success = await service.deleteDescription(id);
    await auditLog.append({ action: 'delete', entity: 'description', entityId: id });
    reply.send({ success });
  });
}
