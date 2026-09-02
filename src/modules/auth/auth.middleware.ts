import type { FastifyReply, FastifyRequest } from 'fastify';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

import { UserRole } from '../../shared/types';

dotenv.config();

/**
 * The authenticated principal that the JWT middleware attaches to a request.
 * It is populated ONLY by the auth middleware after a successful JWT verify;
 * handlers and services must never write to it.
 */
export interface AuthUser {
  id: string;
  role: UserRole;
}

/**
 * A seeded local development user. There is no mock OIDC provider in this
 * feature: the auth middleware resolves the JWT subject against this seed to
 * derive the principal's identity and role.
 */
export interface LocalUser {
  id: string;
  email: string;
  role: UserRole;
  name: string;
}

export const LOCAL_USERS: readonly LocalUser[] = [
  { id: 'emp-alice', email: 'alice@example.com', role: UserRole.employee, name: 'Alice Employee' },
  { id: 'emp-bob', email: 'bob@example.com', role: UserRole.employee, name: 'Bob Employee' },
  { id: 'emp-carol', email: 'carol@example.com', role: UserRole.manager, name: 'Carol Manager' },
  { id: 'emp-dave', email: 'dave@example.com', role: UserRole.hr_admin, name: 'Dave HR Admin' },
];

export interface AuthMiddlewareOptions {
  secret?: string;
  users?: readonly LocalUser[];
}

const BEARER_PREFIX = 'Bearer ';

/**
 * Build a Fastify preHandler that verifies a bearer JWT and populates
 * `request.user` (and only after successful verification). The role is
 * resolved from the seeded local users keyed by the token subject, so a token
 * claim cannot elevate a principal's role.
 */
export function createAuthMiddleware(options: AuthMiddlewareOptions = {}) {
  const users = options.users ?? LOCAL_USERS;

  return async function authenticate(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    const secret = options.secret ?? process.env.JWT_SECRET;
    if (!secret) {
      reply.status(500).send({ error: 'Authentication is not configured', code: 'AUTH_NOT_CONFIGURED' });
      return;
    }

    const authorization = request.headers.authorization;
    if (typeof authorization !== 'string' || !authorization.startsWith(BEARER_PREFIX)) {
      reply.status(401).send({ error: 'Missing bearer token', code: 'UNAUTHORIZED' });
      return;
    }

    const token = authorization.slice(BEARER_PREFIX.length).trim();

    let subject: unknown;
    try {
      const payload: unknown = jwt.verify(token, secret);
      if (typeof payload === 'object' && payload !== null) {
        subject = (payload as { sub?: unknown }).sub;
      }
    } catch {
      reply.status(401).send({ error: 'Invalid or expired token', code: 'UNAUTHORIZED' });
      return;
    }

    if (typeof subject !== 'string') {
      reply.status(401).send({ error: 'Token has no valid subject', code: 'UNAUTHORIZED' });
      return;
    }

    const user = users.find((candidate) => candidate.id === subject);
    if (!user) {
      reply.status(401).send({ error: 'Unknown user', code: 'UNAUTHORIZED' });
      return;
    }

    request.user = { id: user.id, role: user.role };
  };
}

export const authenticate = createAuthMiddleware();

export function findLocalUser(userId: string): LocalUser | undefined {
  return LOCAL_USERS.find((candidate) => candidate.id === userId);
}

export function signLocalToken(userId: string, secret: string): string {
  return jwt.sign({ sub: userId }, secret, { expiresIn: '8h' });
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthUser;
  }
}
