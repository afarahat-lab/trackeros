import { FastifyInstance } from 'fastify';
import { UptimeService } from './uptime.service';

export async function uptimeRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/uptime', async (request, reply) => {
    try {
      const uptimeService = new UptimeService();
      const status = uptimeService.getUptime();
      return reply.status(200).send(status);
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });
}
