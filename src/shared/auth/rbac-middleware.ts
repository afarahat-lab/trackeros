import { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Middleware to enforce role-based access control.
 * @param roles - Allowed roles for the route.
 */
export const rbacMiddleware = (roles: string[]) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const userRole = request.user?.role;
    if (!roles.includes(userRole)) {
      reply.status(403).send({ error: 'Forbidden' });
    }
  };
};