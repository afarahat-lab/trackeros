import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { DescriptionService } from '../service/description-service';
import { auditLog } from '../../shared/utils/audit-log';
import { authMiddleware } from '../../shared/auth/auth-middleware';

const descriptionSchema = z.object({
  title: z.string(),
  content: z.string()
});

const idSchema = z.string().uuid();

export async function descriptionRoutes(fastify: FastifyInstance) {
  const service = new DescriptionService(new DescriptionRepository());

  fastify.get('/api/v1/descriptions', { preHandler: [authMiddleware(['admin', 'operator'])] }, async (request, reply) => {
    const descriptions = await service.getAllDescriptions();
    reply.send({ descriptions });
  });

  fastify.post('/api/v1/descriptions', { preHandler: [authMiddleware(['admin'])] }, async (request, reply) => {
    const { title, content } = descriptionSchema.parse(request.body);
    const description = await service.createDescription(title, content);
    await auditLog.append('description_created', { title, content });
    reply.send({ description });
  });

  fastify.put('/api/v1/descriptions/:id', { preHandler: [authMiddleware(['admin'])] }, async (request, reply) => {
    const id = idSchema.parse(request.params.id);
    const { title, content } = descriptionSchema.parse(request.body);
    const description = await service.updateDescription(id, title, content);
    await auditLog.append('description_updated', { id, title, content });
    reply.send({ description });
  });

  fastify.delete('/api/v1/descriptions/:id', { preHandler: [authMiddleware(['admin'])] }, async (request, reply) => {
    const id = idSchema.parse(request.params.id);
    const success = await service.deleteDescription(id);
    await auditLog.append('description_deleted', { id });
    reply.send({ success });
  });
}