import { FastifyRequest, FastifyReply } from 'fastify';

export async function getYongHandler(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  reply.status(200).send({ message: 'yong' });
}
