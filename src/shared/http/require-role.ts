import { FastifyReply, FastifyRequest } from 'fastify';
import { UserRole } from '../types';

export interface AuthenticatedUser {
  id: string;
  role: UserRole;
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthenticatedUser;
  }
}

export function requireRole(...allowed: UserRole[]) {
  return async function requireRoleHandler(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const user = request.user;
    if (!user) {
      reply.code(401).send({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
      return;
    }
    if (!allowed.includes(user.role)) {
      reply.code(403).send({ error: 'Forbidden', code: 'FORBIDDEN' });
      return;
    }
  };
}
