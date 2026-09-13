import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { AppError, ValidationError } from '../../shared/errors';
import { PgEmployeeRepository } from '../employee';
import { AuthService, IAuthService, LoginInput } from './auth.service';

/**
 * Parse and validate the login payload at the API boundary (GP-003). Reject a
 * missing or non-string email/password up front so the service never sees a
 * malformed body.
 */
function parseLoginBody(body: unknown): LoginInput {
  const raw = (body ?? {}) as Record<string, unknown>;

  if (typeof raw.email !== 'string') {
    throw new ValidationError('email is required');
  }
  if (typeof raw.password !== 'string') {
    throw new ValidationError('password is required');
  }

  return { email: raw.email, password: raw.password };
}

function sendError(reply: FastifyReply, error: unknown): FastifyReply {
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({ error: error.message, code: error.code });
  }
  return reply.status(500).send({ error: 'Internal Server Error' });
}

export async function authRoutes(fastify: FastifyInstance): Promise<void> {
  const authService: IAuthService =
    (fastify as unknown as { authService?: IAuthService }).authService ??
    new AuthService(new PgEmployeeRepository());

  fastify.post('/auth/login', async (request: FastifyRequest, reply) => {
    try {
      const result = await authService.login(parseLoginBody(request.body));
      return reply.status(200).send(result);
    } catch (error) {
      request.log.error(error);
      return sendError(reply, error);
    }
  });
}
