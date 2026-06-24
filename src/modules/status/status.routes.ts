import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { StatusService } from './status.service';
import { IStatusService } from './status.service.interface';
import { SystemStatus } from './status.model';

export async function statusRoutes(fastify: FastifyInstance): Promise<void> {
  const statusService: IStatusService = new StatusService();

  fastify.get('/status', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const status: SystemStatus = statusService.getStatus();
      return reply.status(200).send(status);
    } catch (error) {
      return reply.status(500).send({ up: false, version: '1' });
    }
  });
}
