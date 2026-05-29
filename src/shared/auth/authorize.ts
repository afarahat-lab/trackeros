import { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Middleware to authorize requests based on roles.
 * @param roles The roles allowed to access the route.
 */
export function authorize(roles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    // Implement role-based access control logic here
  };
}
