import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { verifyRoles } from '../../shared/auth/rbac-middleware';

/**
 * Registers the hello world route.
 * @param app - The Fastify instance.
 */
export const registerHelloRoutes = (app: FastifyInstance): void => {
  app.get('/api/v1/hello', {
    preHandler: verifyRoles(['admin', 'operator']),
    handler: async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      reply.send({ message: 'hello' });
    }
  });
};
