import { FastifyInstance } from 'fastify';
import { pongController } from './pong.controller';

export async function pongRoutes(fastify: FastifyInstance) {
  fastify.get('/pong', async () => {
    return pongController.getPong();
  });
}
