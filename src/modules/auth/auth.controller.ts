import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from './auth.service';
import { loginSchema, LoginRequest } from './auth.dto';
import { authenticateJWT } from './auth.middleware';

export default async function authRoutes(
  fastify: FastifyInstance,
  opts: { authService: AuthService }
): Promise<void> {
  const { authService } = opts;

  fastify.post<{ Body: LoginRequest }>(
    '/auth/login',
    { schema: loginSchema },
    async (request: FastifyRequest<{ Body: LoginRequest }>, reply: FastifyReply) => {
      try {
        const { username, password } = request.body;
        const token = await authService.login(username, password);
        reply.send({ token });
      } catch (err: any) {
        request.log.error({ err }, 'Login failed');
        reply.status(401).send({ error: err.message });
      }
    }
  );

  fastify.post(
    '/auth/logout',
    { preHandler: [authenticateJWT] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      // JWT is stateless; client discards token.
      reply.send({ message: 'Logged out successfully' });
    }
  );
}
