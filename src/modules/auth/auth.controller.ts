import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from './auth.service';
import { UserRepository } from './user.repository';
import { loginSchema, LoginRequest } from './auth.dto';
import { authenticateJWT } from './auth.middleware';
import { Pool } from 'pg';

export default async function authRoutes(fastify: FastifyInstance, opts: { pool: Pool; jwtSecret: string }) {
  const userRepository = new UserRepository(opts.pool);
  const authService = new AuthService(userRepository, opts.jwtSecret);

  fastify.decorateRequest('user', null);

  fastify.post<{ Body: LoginRequest }>('/auth/login', { schema: { body: loginSchema } }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { username, password } = request.body;
      const token = await authService.login(username, password);
      return { token };
    } catch (error: any) {
      if (error.message === 'Invalid credentials') {
        return reply.status(401).send({ error: 'Invalid credentials' });
      }
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  fastify.post('/auth/logout', { preHandler: authenticateJWT }, async (request: FastifyRequest, reply: FastifyReply) => {
    return { message: 'Logged out successfully' };
  });
}
