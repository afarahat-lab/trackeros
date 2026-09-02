import { FastifyReply, FastifyRequest, HookHandlerDoneFunction } from 'fastify';
import jwt from 'jsonwebtoken';

import type { AuthenticatedUser } from './authenticated-user';
import { isUserRole } from './authenticated-user';
import { AuthenticationError } from './auth.errors';
import { findLocalUserById } from './local-users';

const BEARER_PREFIX = 'Bearer ';
const INVALID_TOKEN_CODE = 'INVALID_TOKEN';
const TOKEN_EXPIRED_CODE = 'TOKEN_EXPIRED';

/**
 * Read and verify the JWT secret from the environment. The middleware never
 * falls back to a hardcoded secret: when no secret is configured it fails
 * closed so a request is never authenticated against an embedded value.
 */
function jwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new AuthenticationError(
      'AUTH_NOT_CONFIGURED',
      'JWT secret is not configured'
    );
  }
  return secret;
}

/** Case-insensitive extraction of the bearer token from the Authorization header. */
function readBearerToken(authorization: string | undefined): string | null {
  if (!authorization) {
    return null;
  }
  if (authorization.startsWith(BEARER_PREFIX)) {
    const token = authorization.slice(BEARER_PREFIX.length).trim();
    return token.length > 0 ? token : null;
  }
  const lower = authorization.toLowerCase();
  if (lower.startsWith(BEARER_PREFIX.toLowerCase())) {
    const token = authorization.slice(BEARER_PREFIX.length).trim();
    return token.length > 0 ? token : null;
  }
  return null;
}

function toAuthenticatedUser(token: string): AuthenticatedUser {
  let decoded: string | Record<string, unknown>;
  try {
    decoded = jwt.verify(token, jwtSecret());
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new AuthenticationError(TOKEN_EXPIRED_CODE, 'Token has expired');
    }
    throw new AuthenticationError(INVALID_TOKEN_CODE, 'Invalid or malformed token');
  }

  if (typeof decoded === 'string' || decoded === null) {
    throw new AuthenticationError(INVALID_TOKEN_CODE, 'Invalid token payload');
  }

  const id = decoded.sub;
  const role = decoded.role;

  if (typeof id !== 'string' || id.length === 0) {
    throw new AuthenticationError(INVALID_TOKEN_CODE, 'Token is missing a subject');
  }
  if (!isUserRole(role)) {
    throw new AuthenticationError(INVALID_TOKEN_CODE, 'Token carries an unknown role');
  }
  if (!findLocalUserById(id)) {
    throw new AuthenticationError(INVALID_TOKEN_CODE, 'Token subject is not a known local user');
  }

  return { id, role };
}

/**
 * Fastify `preHandler` hook that verifies a bearer JWT and populates
 * `request.user` with `{ id, role }`. On any failure it sends `401` with the
 * `{ error, code }` shape and leaves `request.user` unset. Only this hook sets
 * `request.user`; handlers must never assign it.
 */
export function authenticate(
  request: FastifyRequest,
  reply: FastifyReply,
  done: HookHandlerDoneFunction
): void {
  try {
    const token = readBearerToken(request.headers.authorization);
    if (!token) {
      reply.status(401).send({
        error: 'Missing bearer token',
        code: 'MISSING_TOKEN',
      });
      return done();
    }

    request.user = toAuthenticatedUser(token);
    return done();
  } catch (err) {
    if (err instanceof AuthenticationError) {
      reply.status(401).send({
        error: err.message,
        code: err.code,
      });
      return done();
    }
    // Never leak unexpected failures to the caller as a token detail.
    request.log.error({ err }, 'Unexpected error during authentication');
    reply.status(500).send({
      error: 'Internal Server Error',
      code: 'INTERNAL_ERROR',
    });
    return done();
  }
}
