import { FastifyInstance } from 'fastify';
import { ZonkController } from './zonk.controller';

export function registerZonkRoutes(app: FastifyInstance): void {
  const controller = new ZonkController();
  app.get('/zonk', async (request, reply) => {
    const result = await controller.getZonk();
    reply.status(200).send(result);
  });
}
