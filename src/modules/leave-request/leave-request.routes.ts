import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { LeaveRequestService } from './leave-request.service';
import { LeaveRequestRepository } from './leave-request.repository';
import { LeaveBalanceService } from '../leave-balance/leave-balance.service';
import { LeaveBalanceRepository } from '../leave-balance/leave-balance.repository';
import { AuditRepository } from '../audit/audit-record.repository';
import { NotificationRepository } from '../notification/notification.repository';
import { LeavePolicyService } from '../leave-policy/leave-policy.service';
import { LeavePolicyRepository } from '../leave-policy/leave-policy.repository';
import { LeaveTypeRepository } from '../leave-policy/leave-type.repository';
import { AppError } from '../leave-policy';
import { CreateLeaveRequestInput } from './leave-request.service.interface';

interface AuthenticatedUser {
  id: string;
  role: 'employee' | 'manager' | 'hr_admin';
}

function getUser(request: FastifyRequest): AuthenticatedUser {
  const user = (request as unknown as Record<string, unknown>).user;
  if (!user || typeof user !== 'object') {
    throw new AppError('Authentication required', 'UNAUTHORIZED');
  }
  const u = user as Record<string, unknown>;
  if (typeof u.id !== 'string' || typeof u.role !== 'string') {
    throw new AppError('Invalid authentication token', 'UNAUTHORIZED');
  }
  return { id: u.id, role: u.role as AuthenticatedUser['role'] };
}

function requireRole(
  user: AuthenticatedUser,
  ...roles: Array<AuthenticatedUser['role']>
): void {
  if (!roles.includes(user.role)) {
    throw new AppError('Insufficient permissions', 'FORBIDDEN');
  }
}

function parseDate(value: unknown, fieldName: string): Date {
  if (typeof value !== 'string') {
    throw new AppError(`${fieldName} must be a string`, 'VALIDATION_ERROR');
  }
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    throw new AppError(`${fieldName} must be a valid date`, 'VALIDATION_ERROR');
  }
  return date;
}

export async function leaveRequestRoutes(fastify: FastifyInstance): Promise<void> {
  const requestRepo = new LeaveRequestRepository();
  const balanceRepo = new LeaveBalanceRepository();
  const auditRepo = new AuditRepository();
  const notificationRepo = new NotificationRepository();
  const policyRepo = new LeavePolicyRepository();
  const typeRepo = new LeaveTypeRepository();
  const policyService = new LeavePolicyService(policyRepo, typeRepo);
  const balanceService = new LeaveBalanceService(balanceRepo, policyService);
  const leaveRequestService = new LeaveRequestService(
    requestRepo,
    balanceService,
    balanceRepo,
    auditRepo,
    notificationRepo,
    policyService,
    typeRepo,
  );

  // POST /api/leave-requests — create draft
  fastify.post('/api/leave-requests', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = getUser(request);
      requireRole(user, 'employee', 'manager', 'hr_admin');

      const body = request.body as Record<string, unknown> | null;
      if (!body || typeof body !== 'object') {
        return reply.status(400).send({ error: 'Request body is required', code: 'VALIDATION_ERROR' });
      }

      const leaveTypeId = body.leaveTypeId;
      if (typeof leaveTypeId !== 'string' || leaveTypeId.trim().length === 0) {
        return reply.status(400).send({ error: 'leaveTypeId is required', code: 'VALIDATION_ERROR' });
      }

      const startDate = parseDate(body.startDate, 'startDate');
      const endDate = parseDate(body.endDate, 'endDate');

      const reason = body.reason;
      if (reason !== undefined && reason !== null && typeof reason !== 'string') {
        return reply.status(400).send({ error: 'reason must be a string', code: 'VALIDATION_ERROR' });
      }

      const dto: CreateLeaveRequestInput = {
        leaveTypeId,
        startDate,
        endDate,
        reason: reason ?? undefined,
      };

      const result = await leaveRequestService.createDraft(user.id, dto);
      return reply.status(201).send(result);
    } catch (error) {
      if (error instanceof AppError) {
        const statusCode = error.code === 'NOT_FOUND' ? 404
          : error.code === 'FORBIDDEN' ? 403
          : error.code === 'UNAUTHORIZED' ? 401
          : error.code === 'POLICY_VIOLATION' ? 400
          : error.code === 'VALIDATION_ERROR' ? 400
          : error.code === 'INVALID_STATE' ? 409
          : 500;
        return reply.status(statusCode).send({ error: error.message, code: error.code });
      }
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal Server Error', code: 'INTERNAL_ERROR' });
    }
  });

  // GET /api/leave-requests — list own
  fastify.get('/api/leave-requests', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = getUser(request);
      requireRole(user, 'employee', 'manager', 'hr_admin');

      const result = await leaveRequestService.getByEmployee(user.id);
      return reply.status(200).send(result);
    } catch (error) {
      if (error instanceof AppError) {
        const statusCode = error.code === 'NOT_FOUND' ? 404
          : error.code === 'FORBIDDEN' ? 403
          : error.code === 'UNAUTHORIZED' ? 401
          : 500;
        return reply.status(statusCode).send({ error: error.message, code: error.code });
      }
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal Server Error', code: 'INTERNAL_ERROR' });
    }
  });

  // GET /api/leave-requests/:id
  fastify.get('/api/leave-requests/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = getUser(request);
      requireRole(user, 'employee', 'manager', 'hr_admin');

      const params = request.params as Record<string, string>;
      const id = params.id;
      if (!id || typeof id !== 'string') {
        return reply.status(400).send({ error: 'id parameter is required', code: 'VALIDATION_ERROR' });
      }

      const result = await leaveRequestService.getById(id);

      // RBAC: employees can only view their own; managers can view direct reports; HR can view all
      if (user.role === 'employee' && result.employeeId !== user.id) {
        return reply.status(403).send({ error: 'You can only view your own leave requests', code: 'FORBIDDEN' });
      }

      return reply.status(200).send(result);
    } catch (error) {
      if (error instanceof AppError) {
        const statusCode = error.code === 'NOT_FOUND' ? 404
          : error.code === 'FORBIDDEN' ? 403
          : error.code === 'UNAUTHORIZED' ? 401
          : 500;
        return reply.status(statusCode).send({ error: error.message, code: error.code });
      }
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal Server Error', code: 'INTERNAL_ERROR' });
    }
  });

  // PATCH /api/leave-requests/:id/submit
  fastify.patch('/api/leave-requests/:id/submit', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = getUser(request);
      requireRole(user, 'employee', 'manager', 'hr_admin');

      const params = request.params as Record<string, string>;
      const id = params.id;
      if (!id || typeof id !== 'string') {
        return reply.status(400).send({ error: 'id parameter is required', code: 'VALIDATION_ERROR' });
      }

      const result = await leaveRequestService.submit(id, user.id);
      return reply.status(200).send(result);
    } catch (error) {
      if (error instanceof AppError) {
        const statusCode = error.code === 'NOT_FOUND' ? 404
          : error.code === 'FORBIDDEN' ? 403
          : error.code === 'UNAUTHORIZED' ? 401
          : error.code === 'POLICY_VIOLATION' ? 400
          : error.code === 'VALIDATION_ERROR' ? 400
          : error.code === 'INVALID_STATE' ? 409
          : error.code === 'INSUFFICIENT_BALANCE' ? 400
          : 500;
        return reply.status(statusCode).send({ error: error.message, code: error.code });
      }
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal Server Error', code: 'INTERNAL_ERROR' });
    }
  });

  // PATCH /api/leave-requests/:id/approve
  fastify.patch('/api/leave-requests/:id/approve', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = getUser(request);
      requireRole(user, 'manager', 'hr_admin');

      const params = request.params as Record<string, string>;
      const id = params.id;
      if (!id || typeof id !== 'string') {
        return reply.status(400).send({ error: 'id parameter is required', code: 'VALIDATION_ERROR' });
      }

      const result = await leaveRequestService.approve(id, user.id);
      return reply.status(200).send(result);
    } catch (error) {
      if (error instanceof AppError) {
        const statusCode = error.code === 'NOT_FOUND' ? 404
          : error.code === 'FORBIDDEN' ? 403
          : error.code === 'UNAUTHORIZED' ? 401
          : error.code === 'POLICY_VIOLATION' ? 400
          : error.code === 'VALIDATION_ERROR' ? 400
          : error.code === 'INVALID_STATE' ? 409
          : error.code === 'INSUFFICIENT_BALANCE' ? 400
          : 500;
        return reply.status(statusCode).send({ error: error.message, code: error.code });
      }
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal Server Error', code: 'INTERNAL_ERROR' });
    }
  });

  // PATCH /api/leave-requests/:id/reject
  fastify.patch('/api/leave-requests/:id/reject', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = getUser(request);
      requireRole(user, 'manager', 'hr_admin');

      const params = request.params as Record<string, string>;
      const id = params.id;
      if (!id || typeof id !== 'string') {
        return reply.status(400).send({ error: 'id parameter is required', code: 'VALIDATION_ERROR' });
      }

      const body = request.body as Record<string, unknown> | null;
      const reason = body && typeof body.reason === 'string' ? body.reason : '';
      if (!reason || reason.trim().length === 0) {
        return reply.status(400).send({ error: 'reason is required', code: 'VALIDATION_ERROR' });
      }

      const result = await leaveRequestService.reject(id, user.id, reason);
      return reply.status(200).send(result);
    } catch (error) {
      if (error instanceof AppError) {
        const statusCode = error.code === 'NOT_FOUND' ? 404
          : error.code === 'FORBIDDEN' ? 403
          : error.code === 'UNAUTHORIZED' ? 401
          : error.code === 'POLICY_VIOLATION' ? 400
          : error.code === 'VALIDATION_ERROR' ? 400
          : error.code === 'INVALID_STATE' ? 409
          : 500;
        return reply.status(statusCode).send({ error: error.message, code: error.code });
      }
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal Server Error', code: 'INTERNAL_ERROR' });
    }
  });

  // PATCH /api/leave-requests/:id/cancel
  fastify.patch('/api/leave-requests/:id/cancel', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = getUser(request);
      requireRole(user, 'employee', 'manager', 'hr_admin');

      const params = request.params as Record<string, string>;
      const id = params.id;
      if (!id || typeof id !== 'string') {
        return reply.status(400).send({ error: 'id parameter is required', code: 'VALIDATION_ERROR' });
      }

      const result = await leaveRequestService.cancel(id, user.id);
      return reply.status(200).send(result);
    } catch (error) {
      if (error instanceof AppError) {
        const statusCode = error.code === 'NOT_FOUND' ? 404
          : error.code === 'FORBIDDEN' ? 403
          : error.code === 'UNAUTHORIZED' ? 401
          : error.code === 'POLICY_VIOLATION' ? 400
          : error.code === 'VALIDATION_ERROR' ? 400
          : error.code === 'INVALID_STATE' ? 409
          : 500;
        return reply.status(statusCode).send({ error: error.message, code: error.code });
      }
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal Server Error', code: 'INTERNAL_ERROR' });
    }
  });
}
