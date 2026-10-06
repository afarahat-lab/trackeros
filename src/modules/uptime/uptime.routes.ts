import { FastifyInstance } from 'fastify';
import { UptimeService } from './uptime.service';
import { ReadinessState, ReadinessStatus } from './uptime.model';

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

  fastify.get('/ready', async (request, reply) => {
    try {
      const uptimeService = new UptimeService();
      const result = await uptimeService.checkReadiness();
      if (!result.ok) {
        request.log.error(result.error);
        const body: ReadinessStatus = { status: ReadinessState.NOT_READY };
        return reply.status(503).send(body);
      }
      const body: ReadinessStatus = { status: ReadinessState.READY };
      return reply.status(200).send(body);
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });
}
