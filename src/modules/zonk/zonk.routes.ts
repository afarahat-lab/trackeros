import { FastifyInstance } from 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    zonk: () => string;
  }
}

export default async function zonkRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/zonk', async (_request, _reply) => {
    return { message: 'zonk' };
  });
}
