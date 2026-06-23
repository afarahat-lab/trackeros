import { FastifyRequest, FastifyReply } from 'fastify';

export function requireRoles(allowedRoles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    if (!user || !user.roles || !user.roles.some((role: string) => allowedRoles.includes(role))) {
      reply.status(403).send({ message: 'Forbidden' });
      return;
    }
  };
}
