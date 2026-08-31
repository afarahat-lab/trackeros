import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { UnitOfWork } from '../../shared/db/unit-of-work.impl';
import { requireRole } from '../../shared/http/require-role';
import { UserRole } from '../../shared/types';
import {
  CreateLeaveBalanceInput,
  NegativeBalanceCounterError,
} from './balance.model';
import { PgLeaveBalanceRepository } from './balance.repository';
import { BalanceService } from './balance.service';

const createBalanceSchema = z.object({
  employeeId: z.string().min(1),
  policyId: z.string().min(1),
  totalEntitlement: z.number().int().min(0),
  usedDays: z.number().int().min(0),
  remainingDays: z.number().int().min(0),
  fiscalYear: z.number().int(),
  status: z.enum(['ACTIVE', 'CLOSED']),
});

const adjustBalanceSchema = z.object({
  days: z.number().int().min(0),
});

const balanceError = {
  VALIDATION_ERROR: (message: string): { error: string; code: string } => ({
    error: message,
    code: 'VALIDATION_ERROR',
  }),
  NOT_FOUND: (message: string): { error: string; code: string } => ({
    error: message,
    code: 'NOT_FOUND',
  }),
  INTERNAL_ERROR: { error: 'Internal Server Error', code: 'INTERNAL_ERROR' },
};

export async function balanceRoutes(fastify: FastifyInstance): Promise<void> {
  const balances = new BalanceService(
    new PgLeaveBalanceRepository(),
    new UnitOfWork(),
  );

  fastify.get<{ Params: { id: string } }>(
    '/balances/:id',
    { preHandler: requireRole(UserRole.HR_ADMIN, UserRole.MANAGER) },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const balance = await balances.findById(id);
        if (!balance) {
          return reply
            .status(404)
            .send(balanceError.NOT_FOUND('Balance not found'));
        }
        return reply.status(200).send(balance);
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send(balanceError.INTERNAL_ERROR);
      }
    },
  );

  fastify.get<{ Params: { employeeId: string } }>(
    '/employees/:employeeId/balances',
    { preHandler: requireRole(UserRole.HR_ADMIN, UserRole.MANAGER) },
    async (request, reply) => {
      try {
        const { employeeId } = request.params;
        const result = await balances.findByEmployee(employeeId);
        return reply.status(200).send(result);
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send(balanceError.INTERNAL_ERROR);
      }
    },
  );

  fastify.post(
    '/balances',
    { preHandler: requireRole(UserRole.HR_ADMIN) },
    async (request, reply) => {
      try {
        const parsed = createBalanceSchema.safeParse(request.body);
        if (!parsed.success) {
          return reply
            .status(400)
            .send(balanceError.VALIDATION_ERROR('Invalid request body'));
        }
        const input: CreateLeaveBalanceInput = {
          employeeId: parsed.data.employeeId,
          policyId: parsed.data.policyId,
          totalEntitlement: parsed.data.totalEntitlement,
          usedDays: parsed.data.usedDays,
          remainingDays: parsed.data.remainingDays,
          fiscalYear: parsed.data.fiscalYear,
          status: parsed.data.status,
        };
        const balance = await balances.create(input);
        return reply.status(201).send(balance);
      } catch (error) {
        if (error instanceof NegativeBalanceCounterError) {
          return reply
            .status(400)
            .send(balanceError.VALIDATION_ERROR(error.message));
        }
        request.log.error(error);
        return reply.status(500).send(balanceError.INTERNAL_ERROR);
      }
    },
  );

  fastify.post<{ Params: { id: string } }>(
    '/balances/:id/deduct',
    { preHandler: requireRole(UserRole.HR_ADMIN) },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const parsed = adjustBalanceSchema.safeParse(request.body);
        if (!parsed.success) {
          return reply
            .status(400)
            .send(balanceError.VALIDATION_ERROR('Invalid request body'));
        }
        const balance = await balances.deduct(id, parsed.data.days);
        return reply.status(200).send(balance);
      } catch (error) {
        if (error instanceof NegativeBalanceCounterError) {
          return reply
            .status(400)
            .send(balanceError.VALIDATION_ERROR(error.message));
        }
        request.log.error(error);
        return reply.status(500).send(balanceError.INTERNAL_ERROR);
      }
    },
  );

  fastify.post<{ Params: { id: string } }>(
    '/balances/:id/restore',
    { preHandler: requireRole(UserRole.HR_ADMIN) },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const parsed = adjustBalanceSchema.safeParse(request.body);
        if (!parsed.success) {
          return reply
            .status(400)
            .send(balanceError.VALIDATION_ERROR('Invalid request body'));
        }
        const balance = await balances.restore(id, parsed.data.days);
        return reply.status(200).send(balance);
      } catch (error) {
        if (error instanceof NegativeBalanceCounterError) {
          return reply
            .status(400)
            .send(balanceError.VALIDATION_ERROR(error.message));
        }
        request.log.error(error);
        return reply.status(500).send(balanceError.INTERNAL_ERROR);
      }
    },
  );
}
