import { FastifyInstance, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import { ILeaveService } from './leave.service';
import {
  submitLeaveRequestHandler,
  approveLeaveRequestHandler,
  rejectLeaveRequestHandler,
  cancelLeaveRequestHandler,
  getLeaveRequestHandler,
  listLeaveRequestsHandler,
  AuthenticatedRequest
} from './leave.controller';

const authenticate = async (request: AuthenticatedRequest, reply: FastifyReply) => {
  const authHeader = request.headers.authorization;
  if (!authHeader) {
    return reply.code(401).send({ message: 'No token provided' });
  }
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || !/^Bearer$/i.test(parts[0])) {
    return reply.code(401).send({ message: 'Token error' });
  }
  try {
    const secret = process.env.JWT_SECRET || 'default_secret';
    const decoded = jwt.verify(parts[1], secret) as any;
    request.user = { employeeId: decoded.employeeId, role: decoded.role };
  } catch (error) {
    return reply.code(401).send({ message: 'Invalid token' });
  }
};

const authorize = (role: string) => {
  return async (request: AuthenticatedRequest, reply: FastifyReply) => {
    if (!request.user || request.user.role !== role) {
      return reply.code(403).send({ message: 'Forbidden' });
    }
  };
};

export async function leaveRoutes(fastify: FastifyInstance, leaveService: ILeaveService) {
  const app = fastify as any;

  app.post('/leave/requests', {
    preHandler: [authenticate, authorize('employee')]
  }, submitLeaveRequestHandler(leaveService));

  app.patch('/leave/requests/:id/approve', {
    preHandler: [authenticate, authorize('manager')]
  }, approveLeaveRequestHandler(leaveService));

  app.patch('/leave/requests/:id/reject', {
    preHandler: [authenticate, authorize('manager')]
  }, rejectLeaveRequestHandler(leaveService));

  app.patch('/leave/requests/:id/cancel', {
    preHandler: [authenticate, authorize('employee')]
  }, cancelLeaveRequestHandler(leaveService));

  app.get('/leave/requests/:id', {
    preHandler: [authenticate]
  }, getLeaveRequestHandler(leaveService));

  app.get('/leave/requests', {
    preHandler: [authenticate]
  }, listLeaveRequestsHandler(leaveService));
}
