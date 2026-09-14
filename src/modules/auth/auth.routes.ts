import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { AppError, ValidationError } from '../../shared/errors';
import { createAuthService, IAuthService } from './auth.service';

interface LoginBody {
  email: string;
  password: string;
}

/**
 * Parse the login payload from the wire. JSON delivers only strings, so validate
 * the shape explicitly at the boundary (GP-003) rather than casting `request.body`.
 */
function parseLoginBody(body: unknown): LoginBody {
  const raw = (body ?? {}) as Record<string, unknown>;

  if (typeof raw.email !== 'string' || raw.email.trim() === '') {
    throw new ValidationError('email is required');
  }
  if (typeof raw.password !== 'string' || raw.password.trim() === '') {
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
    (fastify as unknown as { authService?: IAuthService }).authService ?? createAuthService();

  fastify.post('/auth/login', async (request: FastifyRequest, reply) => {
    try {
      const { email, password } = parseLoginBody(request.body);
      const result = await authService.login(email, password);
      return reply.status(200).send(result);
    } catch (error) {
      request.log.error(error);
      return sendError(reply, error);
    }
  });
}
