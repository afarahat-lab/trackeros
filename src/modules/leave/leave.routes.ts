import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { AppError, ForbiddenError } from '../../shared/errors';
import {
  LeaveStatus,
  LeaveTypeCode,
  EmployeeRole,
  CreateLeaveRequestDto,
  LeaveRequestQueryParams,
} from '../../shared/types';
import { PgUnitOfWork } from '../../shared/db';
import { PgLeaveBalanceRepository } from '../balance';
import { AuditService, PgAuditLogRepository } from '../audit';
import { NotificationService, PgNotificationRepository } from '../notification';
import { EmployeeService, PgEmployeeRepository } from '../employee';
import { ValidationService } from '../validation';
import { LeaveService } from './leave.service';
import { PgLeaveRequestRepository } from './leave.repository';

/**
 * Authenticated principal placed on `request.user` by an upstream JWT guard.
 * Routes enforce RBAC (GP-005) by inspecting `role` before delegating to the
 * service; the service re-validates transition authorization.
 */
interface AuthUser {
  id: string;
  role: EmployeeRole;
}

type AuthenticatedRequest = FastifyRequest & { user: AuthUser };

function toLeaveTypeCode(value: unknown): LeaveTypeCode | undefined {
  if (typeof value !== 'string' || !Object.values(LeaveTypeCode).includes(value as LeaveTypeCode)) {
    return undefined;
  }
  return value as LeaveTypeCode;
}

function toLeaveStatus(value: unknown): LeaveStatus | undefined {
  if (typeof value !== 'string' || !Object.values(LeaveStatus).includes(value as LeaveStatus)) {
    return undefined;
  }
  return value as LeaveStatus;
}

function toNumber(value: unknown): number | undefined {
  if (typeof value !== 'string' || value.trim() === '') {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toDate(value: unknown): Date | undefined {
  if (typeof value !== 'string' || value.trim() === '') {
    return undefined;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function sendError(reply: FastifyReply, error: unknown): FastifyReply {
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({ error: error.message, code: error.code });
  }
  reply.log.error(error);
  return reply.status(500).send({ error: 'Internal Server Error', code: 'INTERNAL_ERROR' });
}

export async function leaveRoutes(fastify: FastifyInstance): Promise<void> {
  const leaveService = new LeaveService(
    new PgLeaveRequestRepository(),
    new PgLeaveBalanceRepository(),
    new AuditService(new PgAuditLogRepository()),
    new NotificationService(new PgNotificationRepository()),
    new EmployeeService(new PgEmployeeRepository()),
    new ValidationService(),
    new PgUnitOfWork(),
  );

  function requireRole(
    request: FastifyRequest,
    ...allowed: EmployeeRole[]
  ): AuthUser | never {
    const user = (request as AuthenticatedRequest).user;
    if (!user || !allowed.includes(user.role)) {
      throw new ForbiddenError('Insufficient permissions');
    }
    return user;
  }

  fastify.get('/leave', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      requireRole(request, EmployeeRole.MANAGER, EmployeeRole.ADMIN);
      const q = request.query as Record<string, unknown>;
      const params: LeaveRequestQueryParams = {
        status: toLeaveStatus(q.status),
        leaveTypeCode: toLeaveTypeCode(q.leaveTypeCode),
        startDateFrom: toDate(q.startDateFrom),
        startDateTo: toDate(q.startDateTo),
        endDateFrom: toDate(q.endDateFrom),
        endDateTo: toDate(q.endDateTo),
        limit: toNumber(q.limit),
        offset: toNumber(q.offset),
      };
      return reply.status(200).send(await leaveService.list(params));
    } catch (error) {
      return sendError(reply, error);
    }
  });

  fastify.get('/leave/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      requireRole(request, EmployeeRole.MANAGER, EmployeeRole.ADMIN);
      const { id } = request.params as { id: string };
      return reply.status(200).send(await leaveService.getById(id));
    } catch (error) {
      return sendError(reply, error);
    }
  });

  fastify.post('/leave', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = requireRole(
        request,
        EmployeeRole.EMPLOYEE,
        EmployeeRole.MANAGER,
        EmployeeRole.ADMIN,
      );
      const body = (request.body ?? {}) as Partial<CreateLeaveRequestDto>;
      // Validate inputs at the API boundary (GP-003); invalid dates/type yield a
      // ValidationError in the service which maps to a 400 response.
      const dto: CreateLeaveRequestDto = {
        employeeId: user.id,
        leaveTypeCode: body.leaveTypeCode as LeaveTypeCode,
        startDate: toDate(body.startDate) as Date,
        endDate: toDate(body.endDate) as Date,
        reason: body.reason,
      };
      return reply.status(201).send(await leaveService.create(dto));
    } catch (error) {
      return sendError(reply, error);
    }
  });

  fastify.post('/leave/:id/submit', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      requireRole(request, EmployeeRole.EMPLOYEE, EmployeeRole.MANAGER, EmployeeRole.ADMIN);
      const { id } = request.params as { id: string };
      return reply.status(200).send(await leaveService.submit(id));
    } catch (error) {
      return sendError(reply, error);
    }
  });

  fastify.post('/leave/:id/approve', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = requireRole(request, EmployeeRole.MANAGER, EmployeeRole.ADMIN);
      const { id } = request.params as { id: string };
      const body = (request.body ?? {}) as { approvalComment?: string };
      return reply
        .status(200)
        .send(await leaveService.approve(id, user.id, body.approvalComment));
    } catch (error) {
      return sendError(reply, error);
    }
  });

  fastify.post('/leave/:id/reject', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = requireRole(request, EmployeeRole.MANAGER, EmployeeRole.ADMIN);
      const { id } = request.params as { id: string };
      const body = (request.body ?? {}) as { approvalComment?: string };
      return reply
        .status(200)
        .send(await leaveService.reject(id, user.id, body.approvalComment));
    } catch (error) {
      return sendError(reply, error);
    }
  });
}
