import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { PropsService } from '../service/props-service';
import { auditLog } from '../../shared/utils/audit-log';
import { authenticate, authorize } from '../../shared/auth/middleware';

const propsSchema = z.object({
  name: z.string(),
  value: z.string()
});

const idSchema = z.string().uuid();

export async function registerPropsRoutes(fastify: FastifyInstance): Promise<void> {
  const service = new PropsService();

  fastify.get('/api/v1/props', {
    preHandler: [authenticate, authorize(['admin', 'operator'])]
  }, async (request, reply) => {
    const props = await service.getAllProps();
    reply.send({ props });
  });

  fastify.post('/api/v1/props', {
    preHandler: [authenticate, authorize(['admin'])]
  }, async (request, reply) => {
    const { name, value } = propsSchema.parse(request.body);
    const prop = await service.createProp(name, value);
    await auditLog.append('create', { entity: 'Props', id: prop.id });
    reply.send({ prop });
  });

  fastify.put('/api/v1/props/:id', {
    preHandler: [authenticate, authorize(['admin'])]
  }, async (request, reply) => {
    const id = idSchema.parse(request.params.id);
    const { name, value } = propsSchema.parse(request.body);
    const prop = await service.updateProp(id, name, value);
    await auditLog.append('update', { entity: 'Props', id });
    reply.send({ prop });
  });

  fastify.delete('/api/v1/props/:id', {
    preHandler: [authenticate, authorize(['admin'])]
  }, async (request, reply) => {
    const id = idSchema.parse(request.params.id);
    await service.deleteProp(id);
    await auditLog.append('delete', { entity: 'Props', id });
    reply.send({});
  });
}