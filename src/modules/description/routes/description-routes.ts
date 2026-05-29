import { FastifyInstance } from 'fastify';
import { DescriptionService } from '../service/description-service';
import { descriptionSchema } from '../domain/description';
import { auditLog } from '../../shared/utils/audit-log';

/**
 * Registers description routes with the Fastify instance.
 */
export async function descriptionRoutes(fastify: FastifyInstance): Promise<void> {
  const service = new DescriptionService();

  fastify.get('/api/v1/descriptions', {
    preHandler: fastify.auth([fastify.verifyJWT, fastify.verifyRoles(['admin', 'operator'])]),
    handler: async (request, reply) => {
      const descriptions = await service.getAllDescriptions();
      await auditLog.append('getAllDescriptions', { userId: request.user.id });
      reply.send({ descriptions });
    }
  });

  fastify.post('/api/v1/descriptions', {
    preHandler: fastify.auth([fastify.verifyJWT, fastify.verifyRoles(['admin'])]),
    schema: { body: descriptionSchema },
    handler: async (request, reply) => {
      const description = await service.createDescription(request.body);
      await auditLog.append('description_created', { userId: request.user.id, descriptionId: description.id });
      reply.send({ description });
    }
  });

  fastify.put('/api/v1/descriptions/:id', {
    preHandler: fastify.auth([fastify.verifyJWT, fastify.verifyRoles(['admin'])]),
    schema: { body: descriptionSchema },
    handler: async (request, reply) => {
      const description = await service.updateDescription(request.params.id, request.body);
      await auditLog.append('description_updated', { userId: request.user.id, descriptionId: description.id });
      reply.send({ description });
    }
  });

  fastify.delete('/api/v1/descriptions/:id', {
    preHandler: fastify.auth([fastify.verifyJWT, fastify.verifyRoles(['admin'])]),
    handler: async (request, reply) => {
      const success = await service.deleteDescription(request.params.id);
      await auditLog.append('description_deleted', { userId: request.user.id, descriptionId: request.params.id });
      reply.send({ success });
    }
  });
}