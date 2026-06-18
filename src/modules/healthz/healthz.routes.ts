import { FastifyInstance } from 'fastify';
import { getHealthz } from './healthz.controller';

export function registerHealthzRoutes(app: FastifyInstance): void {
  app.get('/healthz', async (request, reply) => {
    const health = getHealthz();
    return reply.code(200).send(health);
  });
}
