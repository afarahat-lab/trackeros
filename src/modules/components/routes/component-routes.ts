import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ComponentService } from '../service/component-service';
import { auditLog } from '../../shared/utils/audit-log';

const componentQuerySchema = z.object({
  // Define query parameters schema if needed
});

const componentBodySchema = z.object({
  componentName: z.string(),
  description: z.string().optional(),
  props: z.object({
    // Define the structure of Props here
  })
});

export async function componentRoutes(fastify: FastifyInstance) {
  const service = new ComponentService();

  fastify.get('/api/v1/components', {
    preHandler: fastify.auth([fastify.verifyJWT]),
    schema: {
      querystring: componentQuerySchema
    },
    handler: async (request, reply) => {
      const components = await service.getAllComponents();
      auditLog.append({ action: 'GET_COMPONENTS', userId: request.user.id });
      reply.send({ components });
    }
  });

  fastify.post('/api/v1/components', {
    preHandler: fastify.auth([fastify.verifyJWT]),
    schema: {
      body: componentBodySchema
    },
    handler: async (request, reply) => {
      const componentId = await service.createComponent(request.body);
      auditLog.append({ action: 'CREATE_COMPONENT', userId: request.user.id, componentId });
      reply.send({ componentId });
    }
  });
}
