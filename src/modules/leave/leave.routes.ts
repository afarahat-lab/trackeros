import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { AppError, UnauthorizedError } from '../../shared/errors';
import { CreateLeaveRequestDto, EmployeeRole } from '../../shared/types';
import { LeaveActor, ILeaveService, createLeaveService } from './leave.service';

interface AuthUser {
  id: string;
  role: EmployeeRole;
}

type LeaveAuthRequest = FastifyRequest & { user?: AuthUser };

/**
 * Resolves the authenticated actor from the request. Roles are enforced here
 * at the API boundary (GP-005) before the service is invoked.
 */
function resolveActor(request: LeaveAuthRequest): LeaveActor {
  const user = request.user;
  if (!user || typeof user.id !== 'string' || user.id.trim() === '') {
    throw new UnauthorizedError('Missing authenticated user');
  }
  if (!Object.values(EmployeeRole).includes(user.role)) {
    throw new UnauthorizedError('Invalid user role');
  }
  return { id: user.id, role: user.role };
}

function sendError(reply: FastifyReply, error: unknown): FastifyReply {
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({ error: error.message, code: error.code });
  }
  return reply.status(500).send({ error: 'Internal Server Error' });
}

export async function leaveRoutes(fastify: FastifyInstance): Promise<void> {
  const leaveService: ILeaveService =
    (fastify as unknown as { leaveService?: ILeaveService }).leaveService ?? createLeaveService();

  fastify.post('/leaves', async (request: LeaveAuthRequest, reply) => {
    try {
      const actor = resolveActor(request);
      const body = request.body as CreateLeaveRequestDto;
      const created = await leaveService.create(actor, body);
      return reply.status(201).send(created);
    } catch (error) {
      request.log.error(error);
      return sendError(reply, error);
    }
  });

  fastify.post('/leaves/:id/submit', async (request: LeaveAuthRequest, reply) => {
    try {
      const actor = resolveActor(request);
      const { id } = request.params as { id: string };
      const submitted = await leaveService.submit(actor, id);
      return reply.status(200).send(submitted);
    } catch (error) {
      request.log.error(error);
      return sendError(reply, error);
    }
  });

  fastify.post('/leaves/:id/approve', async (request: LeaveAuthRequest, reply) => {
    try {
      const actor = resolveActor(request);
      const { id } = request.params as { id: string };
      const approved = await leaveService.approve(actor, id);
      return reply.status(200).send(approved);
    } catch (error) {
      request.log.error(error);
      return sendError(reply, error);
    }
  });

  fastify.post('/leaves/:id/reject', async (request: LeaveAuthRequest, reply) => {
    try {
      const actor = resolveActor(request);
      const { id } = request.params as { id: string };
      const rejected = await leaveService.reject(actor, id);
      return reply.status(200).send(rejected);
    } catch (error) {
      request.log.error(error);
      return sendError(reply, error);
    }
  });

  fastify.post('/leaves/:id/cancel', async (request: LeaveAuthRequest, reply) => {
    try {
      const actor = resolveActor(request);
      const { id } = request.params as { id: string };
      const cancelled = await leaveService.cancel(actor, id);
      return reply.status(200).send(cancelled);
    } catch (error) {
      request.log.error(error);
      return sendError(reply, error);
    }
  });
}
