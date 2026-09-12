import { FastifyInstance, FastifyRequest } from 'fastify';
import jwt from 'jsonwebtoken';
import { EmployeeRole } from '../types';
import { UnauthorizedError } from '../errors';

/**
 * The authenticated caller, as every route's `resolveActor` expects to find it.
 *
 * Finding 2 of the deployability brief: routes have always read `request.user` and thrown
 * `UnauthorizedError` when it was absent, but NOTHING ever populated it — no hook, no
 * plugin, no `jwt.verify` anywhere in `src/`. `jsonwebtoken` was a dependency and was
 * never imported. Every request would 401, including the ones the smoke check needs to
 * succeed.
 */
export interface AuthUser {
  id: string;
  role: EmployeeRole;
}

export type AuthedRequest = FastifyRequest & { user?: AuthUser };

/** Routes that must serve an UNAUTHENTICATED caller (liveness, and auth itself). */
const PUBLIC_PATHS = new Set<string>(['/uptime', '/health']);

/**
 * Verify a bearer token and decorate the request.
 *
 * Deliberately a `preHandler` hook rather than per-route middleware: a route that forgets
 * to opt in is the failure mode this whole brief is about, so the default is authenticated
 * and exemptions are explicit and few.
 */
export function registerAuth(app: FastifyInstance): void {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    // Fail at BOOT, not at the first request. A server that starts and then 401s
    // everything is exactly the silent half-configuration this bootstrap exists to end.
    throw new Error(
      'JWT_SECRET is not set — refusing to start. Set it in .env; the smoke check sets it explicitly.'
    );
  }

  app.decorateRequest('user', undefined);

  app.addHook('preHandler', async (request: AuthedRequest) => {
    if (PUBLIC_PATHS.has(request.url.split('?')[0])) return;

    const header = request.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing bearer token');
    }

    try {
      const payload = jwt.verify(header.slice('Bearer '.length), secret) as jwt.JwtPayload;
      const id = typeof payload.sub === 'string' ? payload.sub : '';
      const role = payload.role as EmployeeRole;
      if (!id || !Object.values(EmployeeRole).includes(role)) {
        throw new UnauthorizedError('Token is missing a subject or a valid role');
      }
      request.user = { id, role };
    } catch (err) {
      if (err instanceof UnauthorizedError) throw err;
      throw new UnauthorizedError('Invalid or expired token');
    }
  });
}

/** Mint a token for a known employee — used by the smoke check and by local development. */
export function signToken(user: AuthUser, expiresIn: string = '1h'): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not set');
  return jwt.sign({ sub: user.id, role: user.role }, secret, { expiresIn } as jwt.SignOptions);
}
