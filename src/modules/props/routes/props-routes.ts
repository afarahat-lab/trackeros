import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { PropsService } from '../service/props-service';
import { auditLog } from '../../shared/utils/audit-log';
import { authMiddleware } from '../../shared/auth/auth-middleware';

const createPropSchema = z.object({
  name: z.string(),
  value: z.string()
});

/**
 * Registers props routes.
 * @param {FastifyInstance} app - The Fastify instance.
 * @param {PropsService} service - The props service.
 */
export function registerPropsRoutes(app: FastifyInstance, service: PropsService): void {
  app.get('/api/v1/props', { preHandler: authMiddleware(['admin', 'operator']) }, async (request, reply) => {
    const props = await service.getAllProps();
    reply.send({ props });
  });

  app.post('/api/v1/props', { preHandler: authMiddleware(['admin']) }, async (request, reply) => {
    const parsedBody = createPropSchema.parse(request.body);
    const prop = await service.createProp(parsedBody);
    await auditLog.append('Prop created', { prop });
    reply.send({ prop });
  });
}
