import { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Middleware to verify user roles.
 * @param allowedRoles - Array of roles allowed to access the route.
 */
export const verifyRoles = (allowedRoles: string[]) => {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const userRoles = request.user?.roles || [];
    const hasAccess = allowedRoles.some(role => userRoles.includes(role));

    if (!hasAccess) {
      reply.status(403).send({ error: 'Forbidden' });
    }
  };
};
