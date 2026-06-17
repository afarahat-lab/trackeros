declare module 'fastify' {
  interface FastifyRequest {
    // minimal request shape
  }
  interface FastifyReply {
    send(payload?: any): FastifyReply;
    code(statusCode: number): FastifyReply;
  }
  interface FastifyInstance {
    get(path: string, handler: (request: FastifyRequest, reply: FastifyReply) => void): void;
  }
}

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export default async function zonkRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/zonk', async (request: FastifyRequest, reply: FastifyReply) => {
    reply.send({ message: 'zonk' });
  });
}
