import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { UnitOfWork } from '../../shared/db/unit-of-work.impl';
import { requireRole, AuthenticatedUser } from '../../shared/http/require-role';
import { UserRole } from '../../shared/types';
import { PgLeaveBalanceRepository } from '../balance';
import { PgEmployeeRepository } from '../employee';
import { PgLeavePolicyRepository } from '../policy';
import { AuditService, PgAuditLogRepository } from '../audit';
import {
  InactiveEmployeeError,
  InactiveLeavePolicyError,
  InsufficientLeaveBalanceError,
  InvalidLeaveRequestTransitionError,
  LeaveAuthorizationError,
  OverlappingLeaveError,
} from './leave.model';
import { PgLeaveRequestRepository } from './leave.repository';
import { LeaveService } from './leave.service';

const applyLeaveSchema = z
  .object({
    employeeId: z.string().min(1),
    leaveTypeId: z.string().min(1),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    reason: z.string().nullable().optional(),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: 'endDate must be on or after startDate',
  });

const leaveError = {
  VALIDATION_ERROR: (message: string): { error: string; code: string } => ({
    error: message,
    code: 'VALIDATION_ERROR',
  }),
  NOT_FOUND: (message: string): { error: string; code: string } => ({
    error: message,
    code: 'NOT_FOUND',
  }),
  CONFLICT: (message: string): { error: string; code: string } => ({
    error: message,
    code: 'CONFLICT',
  }),
  FORBIDDEN: (message: string): { error: string; code: string } => ({
    error: message,
    code: 'FORBIDDEN',
  }),
  INTERNAL_ERROR: { error: 'Internal Server Error', code: 'INTERNAL_ERROR' },
};

function actorFrom(request: { user?: AuthenticatedUser }): {
  id: string;
  role: UserRole;
} {
  if (!request.user) {
    throw new LeaveAuthorizationError('Unauthorized');
  }
  return { id: request.user.id, role: request.user.role };
}

export async function leaveRoutes(fastify: FastifyInstance): Promise<void> {
  const uow = new UnitOfWork();
  const service = new LeaveService(
    new PgLeaveRequestRepository(),
    new PgLeaveBalanceRepository(),
    new PgEmployeeRepository(),
    new PgLeavePolicyRepository(),
    new AuditService(new PgAuditLogRepository(), uow),
    uow,
  );

  fastify.post(
    '/leaves',
    { preHandler: requireRole(UserRole.EMPLOYEE, UserRole.MANAGER, UserRole.HR_ADMIN) },
    async (request, reply) => {
      try {
        const parsed = applyLeaveSchema.safeParse(request.body);
        if (!parsed.success) {
          return reply
            .status(400)
            .send(leaveError.VALIDATION_ERROR('Invalid request body'));
        }
        const actor = actorFrom(request);
        const request_ = await service.apply(
          {
            employeeId: parsed.data.employeeId,
            leaveTypeId: parsed.data.leaveTypeId,
            startDate: parsed.data.startDate,
            endDate: parsed.data.endDate,
            reason: parsed.data.reason ?? null,
          },
          actor.id,
          actor.role,
        );
        return reply.status(201).send(request_);
      } catch (error) {
        if (
          error instanceof InactiveEmployeeError ||
          error instanceof InactiveLeavePolicyError
        ) {
          return reply.status(400).send(leaveError.CONFLICT(error.message));
        }
        request.log.error(error);
        return reply.status(500).send(leaveError.INTERNAL_ERROR);
      }
    },
  );

  fastify.post<{ Params: { id: string } }>(
    '/leaves/:id/approve',
    { preHandler: requireRole(UserRole.MANAGER, UserRole.HR_ADMIN) },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const actor = actorFrom(request);
        const result = await service.approve(id, actor.id, actor.role);
        if (!result) {
          return reply
            .status(404)
            .send(leaveError.NOT_FOUND('Leave request not found'));
        }
        return reply.status(200).send(result);
      } catch (error) {
        if (error instanceof LeaveAuthorizationError) {
          return reply.status(403).send(leaveError.FORBIDDEN(error.message));
        }
        if (error instanceof InvalidLeaveRequestTransitionError) {
          return reply.status(400).send(leaveError.CONFLICT(error.message));
        }
        if (error instanceof InsufficientLeaveBalanceError) {
          return reply.status(400).send(leaveError.CONFLICT(error.message));
        }
        if (error instanceof OverlappingLeaveError) {
          return reply.status(400).send(leaveError.CONFLICT(error.message));
        }
        request.log.error(error);
        return reply.status(500).send(leaveError.INTERNAL_ERROR);
      }
    },
  );

  fastify.post<{ Params: { id: string } }>(
    '/leaves/:id/reject',
    { preHandler: requireRole(UserRole.MANAGER, UserRole.HR_ADMIN) },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const actor = actorFrom(request);
        const result = await service.reject(id, actor.id, actor.role);
        if (!result) {
          return reply
            .status(404)
            .send(leaveError.NOT_FOUND('Leave request not found'));
        }
        return reply.status(200).send(result);
      } catch (error) {
        if (error instanceof LeaveAuthorizationError) {
          return reply.status(403).send(leaveError.FORBIDDEN(error.message));
        }
        if (error instanceof InvalidLeaveRequestTransitionError) {
          return reply.status(400).send(leaveError.CONFLICT(error.message));
        }
        request.log.error(error);
        return reply.status(500).send(leaveError.INTERNAL_ERROR);
      }
    },
  );

  fastify.post<{ Params: { id: string } }>(
    '/leaves/:id/cancel',
    { preHandler: requireRole(UserRole.EMPLOYEE, UserRole.MANAGER, UserRole.HR_ADMIN) },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const actor = actorFrom(request);
        const result = await service.cancel(id, actor.id, actor.role);
        if (!result) {
          return reply
            .status(404)
            .send(leaveError.NOT_FOUND('Leave request not found'));
        }
        return reply.status(200).send(result);
      } catch (error) {
        if (error instanceof LeaveAuthorizationError) {
          return reply.status(403).send(leaveError.FORBIDDEN(error.message));
        }
        if (error instanceof InvalidLeaveRequestTransitionError) {
          return reply.status(400).send(leaveError.CONFLICT(error.message));
        }
        request.log.error(error);
        return reply.status(500).send(leaveError.INTERNAL_ERROR);
      }
    },
  );

  fastify.get(
    '/leaves',
    { preHandler: requireRole(UserRole.MANAGER, UserRole.HR_ADMIN) },
    async (request, reply) => {
      try {
        const result = await service.list();
        return reply.status(200).send(result);
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send(leaveError.INTERNAL_ERROR);
      }
    },
  );
}
