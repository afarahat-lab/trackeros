import { FastifyInstance, FastifyReply } from 'fastify';
import { AppError, ValidationError } from '../../shared/errors';
import { IAuthService, createAuthService } from './auth.service';

function parseLoginBody(body: unknown): { email: string; password: string } {
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
    (fastify as unknown as { authService?: IAuthService }).authService ?? createAuthService();

  fastify.post('/auth/login', async (request, reply) => {
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
