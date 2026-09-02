import type { AuthenticatedUser } from './authenticated-user';

declare module 'fastify' {
  interface FastifyRequest {
    /** Populated only by the auth middleware after successful JWT verification. */
    user?: AuthenticatedUser;
  }
}
