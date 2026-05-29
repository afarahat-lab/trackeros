import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { DescriptionService } from '../service/description-service';
import { auditLog } from '../../../shared/utils/audit-log';
import { authMiddleware } from '../../../shared/auth/auth-middleware';

const descriptionSchema = z.object({
  title: z.string(),
  content: z.string()
});

export async function descriptionRoutes(fastify: FastifyInstance, service: DescriptionService) {
  fastify.get('/api/v1/descriptions', { preHandler: authMiddleware(['admin', 'operator']) }, async (request, reply) => {
    const descriptions = await service.getAllDescriptions();
    auditLog.append('getAllDescriptions', { userId: request.user.id });
    reply.send({ descriptions });
  });

  fastify.post('/api/v1/descriptions', { preHandler: authMiddleware(['admin']) }, async (request, reply) => {
    const validation = descriptionSchema.safeParse(request.body);
    if (!validation.success) {
      return reply.status(400).send(validation.error);
    }
    const { title, content } = validation.data;
    const description = await service.createDescription(title, content);
    auditLog.append('createDescription', { userId: request.user.id, descriptionId: description.id });
    reply.status(201).send({ description });
  });
}
