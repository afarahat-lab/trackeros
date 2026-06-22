import { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';

export async function authenticateJWT(request: FastifyRequest, reply: FastifyReply) {
  try {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, request.server.config.JWT_SECRET) as any;
    
    (request as any).user = { employeeId: decoded.sub, role: decoded.role };
  } catch (error) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }
}

export function requireRole(role: string) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if ((request as any).user.role !== role) {
      return reply.status(403).send({ error: 'Forbidden' });
    }
  };
}
