// Minimal Fastify types to avoid external dependency
interface FastifyRequest {
  // no properties needed for this route
}

interface FastifyReply {
  send(payload: unknown): void;
}

interface FastifyInstance {
  get(
    path: string,
    handler: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  ): void;
}

import { ZonkController } from './zonk.controller';

export default async function zonkRoutes(app: FastifyInstance): Promise<void> {
  const controller = new ZonkController();

  app.get('/zonk', async (request: FastifyRequest, reply: FastifyReply) => {
    const greeting = controller.getGreeting();
    reply.send({ message: greeting });
  });
}
