import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { UnitOfWork } from '../../shared/db/unit-of-work.impl';
import { requireRole } from '../../shared/http/require-role';
import { UserRole } from '../../shared/types';
import { PgLeaveBalanceRepository } from '../balance';
import {
  InsufficientLeaveBalanceError,
  InvalidLeaveRequestTransitionError,
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

const approveLeaveSchema = z.object({
  approvedBy: z.string().min(1),
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
  INTERNAL_ERROR: { error: 'Internal Server Error', code: 'INTERNAL_ERROR' },
};

export async function leaveRoutes(fastify: FastifyInstance): Promise<void> {
  const service = new LeaveService(
    new PgLeaveRequestRepository(),
    new PgLeaveBalanceRepository(),
    new UnitOfWork(),
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
        const request_ = await service.apply({
          employeeId: parsed.data.employeeId,
          leaveTypeId: parsed.data.leaveTypeId,
          startDate: parsed.data.startDate,
          endDate: parsed.data.endDate,
          reason: parsed.data.reason ?? null,
        });
        return reply.status(201).send(request_);
      } catch (error) {
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
        const parsed = approveLeaveSchema.safeParse(request.body);
        if (!parsed.success) {
          return reply
            .status(400)
            .send(leaveError.VALIDATION_ERROR('Invalid request body'));
        }
        const result = await service.approve(id, parsed.data.approvedBy);
        if (!result) {
          return reply
            .status(404)
            .send(leaveError.NOT_FOUND('Leave request not found'));
        }
        return reply.status(200).send(result);
      } catch (error) {
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
        const parsed = approveLeaveSchema.safeParse(request.body);
        if (!parsed.success) {
          return reply
            .status(400)
            .send(leaveError.VALIDATION_ERROR('Invalid request body'));
        }
        const result = await service.reject(id, parsed.data.approvedBy);
        if (!result) {
          return reply
            .status(404)
            .send(leaveError.NOT_FOUND('Leave request not found'));
        }
        return reply.status(200).send(result);
      } catch (error) {
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
        const result = await service.cancel(id);
        if (!result) {
          return reply
            .status(404)
            .send(leaveError.NOT_FOUND('Leave request not found'));
        }
        return reply.status(200).send(result);
      } catch (error) {
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
