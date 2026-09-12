import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { AppError, UnauthorizedError, ValidationError } from '../../shared/errors';
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

/**
 * Parse the create payload from the wire.
 *
 * `CreateLeaveRequestDto` declares `startDate`/`endDate` as `Date`, but JSON has no date
 * type — the wire always delivers strings. The handler used to cast the body
 * (`request.body as CreateLeaveRequestDto`), which satisfies the compiler and is simply
 * false at runtime: the service then called `date.getTime()` on a string and every
 * request died with a 500.
 *
 * `tsc` cannot see this (a cast is an assertion, not a check) and the unit tests cannot
 * either — they construct `new Date(...)` and call the service directly, so nothing
 * exercised the HTTP boundary where the conversion has to happen. It was the smoke
 * check's authenticated probe that surfaced it.
 *
 * Converting here keeps `Date` as the domain type and puts the one place strings arrive
 * in charge of the conversion.
 */
function parseCreateBody(body: unknown): CreateLeaveRequestDto {
  const raw = (body ?? {}) as Record<string, unknown>;

  const toDate = (value: unknown, field: string): Date => {
    if (value instanceof Date) return value;
    if (typeof value !== 'string' && typeof value !== 'number') {
      throw new ValidationError(`${field} is required`);
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new ValidationError(`${field} is not a valid date`);
    }
    return parsed;
  };

  if (typeof raw.leaveTypeCode !== 'string') {
    throw new ValidationError('leaveTypeCode is required');
  }

  return {
    employeeId: typeof raw.employeeId === 'string' ? raw.employeeId : '',
    leaveTypeCode: raw.leaveTypeCode as CreateLeaveRequestDto['leaveTypeCode'],
    startDate: toDate(raw.startDate, 'startDate'),
    endDate: toDate(raw.endDate, 'endDate'),
    ...(typeof raw.reason === 'string' ? { reason: raw.reason } : {}),
  };
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
      const created = await leaveService.create(actor, parseCreateBody(request.body));
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
