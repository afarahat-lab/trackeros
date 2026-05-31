import { FastifyInstance } from 'fastify';
import { TypeService } from '../service/type-service';
import { z } from 'zod';

const typeSchema = z.object({
  name: z.string(),
  description: z.string().optional()
});

export async function typeRoutes(fastify: FastifyInstance) {
  const service = new TypeService();

  fastify.get('/api/v1/types', {
    preHandler: fastify.auth([fastify.verifyJWT]),
    schema: {
      querystring: z.object({
        limit: z.number().optional(),
        offset: z.number().optional()
      })
    }
  }, async (request, reply) => {
    const types = await service.getAllTypes();
    reply.send({ types });
  });

  fastify.post('/api/v1/types', {
    preHandler: fastify.auth([fastify.verifyJWT]),
    schema: {
      body: typeSchema
    }
  }, async (request, reply) => {
    const type = await service.createType(request.body);
    reply.send({ type });
  });

  fastify.put('/api/v1/types/:id', {
    preHandler: fastify.auth([fastify.verifyJWT]),
    schema: {
      body: typeSchema
    }
  }, async (request, reply) => {
    const type = await service.updateType(request.params.id, request.body);
    reply.send({ type });
  });

  fastify.delete('/api/v1/types/:id', {
    preHandler: fastify.auth([fastify.verifyJWT])
  }, async (request, reply) => {
    await service.deleteType(request.params.id);
    reply.status(204).send();
  });
}