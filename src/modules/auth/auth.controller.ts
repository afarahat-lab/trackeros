import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from './auth.service';
import { loginSchema } from './auth.dto';
import { authenticateJWT } from './auth.middleware';

export default async function authRoutes(fastify: FastifyInstance, opts: { authService: AuthService }) {
  fastify.post('/api/auth/login', { schema: loginSchema }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { username, password } = request.body as any;
      const token = await opts.authService.login(username, password);
      return { token };
    } catch (error: any) {
      return reply.status(401).send({ error: error.message });
    }
  });

  fastify.post('/api/auth/logout', { preHandler: [authenticateJWT] }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      return { message: 'Logged out successfully' };
    } catch (error: any) {
      return reply.status(401).send({ error: error.message });
    }
  });
}
