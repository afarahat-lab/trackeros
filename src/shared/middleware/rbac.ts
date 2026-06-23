import { FastifyRequest, FastifyReply } from 'fastify';

export const requireRoles = (roles: string[]) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    if (!user || !user.roles) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
    
    const hasRole = roles.some(role => user.roles.includes(role));
    if (!hasRole) {
      return reply.status(403).send({ error: 'Forbidden' });
    }
  };
};
