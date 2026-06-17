import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ZonkController } from './zonk.controller';

export default async function zonkRoutes(app: FastifyInstance): Promise<void> {
  const controller = new ZonkController();

  app.get('/zonk', async (request: FastifyRequest, reply: FastifyReply) => {
    const greeting = controller.getGreeting();
    return reply.send({ message: greeting });
  });
}
