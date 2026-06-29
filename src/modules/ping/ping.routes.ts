import { FastifyInstance } from 'fastify';
import { PingService } from './ping.service';

export async function pingRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/ping', async (request, reply) => {
    try {
      const pingService = new PingService();
      const status = pingService.getPing();
      return reply.status(200).send(status);
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });
}
