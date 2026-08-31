import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { UnitOfWork } from '../../shared/db/unit-of-work.impl';
import { requireRole } from '../../shared/http/require-role';
import { UserRole } from '../../shared/types';
import { AuditService } from '../audit/audit.service';
import { PgAuditLogRepository } from '../audit/audit.repository';
import { CreateLeaveBalanceInput } from './balance.model';
import { PgLeaveBalanceRepository } from './balance.repository';
import { BalanceService } from './balance.service';
import { NegativeBalanceCounterError } from './balance.model';

const leaveBalanceStatusSchema = z.enum(['ACTIVE', 'CLOSED']);

const createBalanceSchema = z.object({
  employeeId: z.string().min(1),
  policyId: z.string().min(1),
  totalEntitlement: z.number().int().min(0),
  usedDays: z.number().int().min(0),
  remainingDays: z.number().int().min(0),
  fiscalYear: z.number().int(),
  status: leaveBalanceStatusSchema,
});

const deductSchema = z.object({
  days: z.number().int().min(0),
});

const restoreSchema = deductSchema;

export async function balanceRoutes(fastify: FastifyInstance): Promise<void> {
  const balances = new BalanceService(
    new PgLeaveBalanceRepository(),
    new AuditService(new PgAuditLogRepository(), new UnitOfWork()),
    new UnitOfWork(),
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
            .send({ error: 'Invalid request body', code: 'VALIDATION_ERROR' });
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
            .send({ error: error.message, code: 'VALIDATION_ERROR' });
        }
        request.log.error(error);
        return reply
          .status(500)
          .send({ error: 'Internal Server Error', code: 'INTERNAL_ERROR' });
      }
    },
  );

  fastify.get<{ Params: { id: string } }>(
    '/balances/:id',
    { preHandler: requireRole(UserRole.HR_ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE) },
    async (request, reply) => {
      try {
        const balance = await balances.findById(request.params.id);
        if (!balance) {
          return reply
            .status(404)
            .send({ error: 'Balance not found', code: 'NOT_FOUND' });
        }
        return reply.status(200).send(balance);
      } catch (error) {
        request.log.error(error);
        return reply
          .status(500)
          .send({ error: 'Internal Server Error', code: 'INTERNAL_ERROR' });
      }
    },
  );

  fastify.get<{ Querystring: { employeeId?: string } }>(
    '/balances',
    { preHandler: requireRole(UserRole.HR_ADMIN, UserRole.MANAGER) },
    async (request, reply) => {
      try {
        const { employeeId } = request.query;
        if (!employeeId) {
          return reply
            .status(400)
            .send({ error: 'employeeId query parameter is required', code: 'VALIDATION_ERROR' });
        }
        const result = await balances.findByEmployee(employeeId);
        return reply.status(200).send(result);
      } catch (error) {
        request.log.error(error);
        return reply
          .status(500)
          .send({ error: 'Internal Server Error', code: 'INTERNAL_ERROR' });
      }
    },
  );

  fastify.post<{ Params: { id: string } }>(
    '/balances/:id/deduct',
    { preHandler: requireRole(UserRole.HR_ADMIN) },
    async (request, reply) => {
      try {
        const parsed = deductSchema.safeParse(request.body);
        if (!parsed.success) {
          return reply
            .status(400)
            .send({ error: 'Invalid request body', code: 'VALIDATION_ERROR' });
        }
        const balance = await balances.deduct(request.params.id, parsed.data.days);
        return reply.status(200).send(balance);
      } catch (error) {
        if (error instanceof NegativeBalanceCounterError) {
          return reply
            .status(400)
            .send({ error: error.message, code: 'VALIDATION_ERROR' });
        }
        request.log.error(error);
        return reply
          .status(500)
          .send({ error: 'Internal Server Error', code: 'INTERNAL_ERROR' });
      }
    },
  );

  fastify.post<{ Params: { id: string } }>(
    '/balances/:id/restore',
    { preHandler: requireRole(UserRole.HR_ADMIN) },
    async (request, reply) => {
      try {
        const parsed = restoreSchema.safeParse(request.body);
        if (!parsed.success) {
          return reply
            .status(400)
            .send({ error: 'Invalid request body', code: 'VALIDATION_ERROR' });
        }
        const balance = await balances.restore(request.params.id, parsed.data.days);
        return reply.status(200).send(balance);
      } catch (error) {
        if (error instanceof NegativeBalanceCounterError) {
          return reply
            .status(400)
            .send({ error: error.message, code: 'VALIDATION_ERROR' });
        }
        request.log.error(error);
        return reply
          .status(500)
          .send({ error: 'Internal Server Error', code: 'INTERNAL_ERROR' });
      }
    },
  );
}
