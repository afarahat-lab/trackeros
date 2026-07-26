
import { FastifyRequest, FastifyReply } from 'fastify';
import { extractTokenFromHeader, verifyToken } from './jwt';
import { UnauthorizedError, ForbiddenError } from '../errorTypes';

export async function authenticate(
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  const authHeader = request.headers.authorization;
  const token = extractTokenFromHeader(authHeader);

  if (!token) {
    throw new UnauthorizedError('Missing or invalid Authorization header');
  }

  try {
    const payload = await verifyToken(token);
    request.user = { userId: payload.userId, role: payload.role };
  } catch (error) {
    if (error instanceof UnauthorizedError || error instanceof ForbiddenError) {
      throw error;
    }
    throw new UnauthorizedError(
      error instanceof Error ? error.message : 'Invalid token',
    );
  }
}

export function requireRole(...roles: string[]) {
  return async function roleGuard(
    request: FastifyRequest,
    _reply: FastifyReply,
  ): Promise<void> {
    if (!request.user) {
      throw new UnauthorizedError('Authentication required');
    }

    if (!roles.includes(request.user.role)) {
      throw new ForbiddenError(
        `Insufficient role: required one of [${roles.join(', ')}], got ${request.user.role}`,
      );
    }
  };
}
