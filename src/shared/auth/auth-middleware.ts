import { FastifyRequest, FastifyReply } from 'fastify';

export function authMiddleware(roles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    // Implement role-based access control logic
    if (!roles.includes(request.user.role)) {
      reply.code(403).send({ error: 'Forbidden' });
    }
  };
}
