import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { UnitOfWork } from '../../shared/db/unit-of-work.impl';
import { requireRole } from '../../shared/http/require-role';
import { LeaveType, UserRole } from '../../shared/types';
import { PgLeavePolicyRepository } from './policy.repository';
import { LeavePolicy } from './policy.model';
import { CreateLeavePolicyInput } from './policy.service.interface';
import {
  PolicyService,
  InvalidLeaveTypeError,
  InvalidEntitlementDaysError,
} from './policy.service';

const leaveTypeSchema = z.enum([
  LeaveType.ANNUAL,
  LeaveType.SICK,
  LeaveType.EMERGENCY,
  LeaveType.UNPAID,
  LeaveType.MATERNITY,
  LeaveType.PATERNITY,
]);

const createPolicySchema = z.object({
  policyName: z.string().min(1),
  leaveType: leaveTypeSchema,
  entitlementDays: z.number().int().min(0),
  accrualRate: z.number().optional(),
  maxAccumulation: z.number().optional(),
  minimumNoticeDays: z.number().int().optional(),
  requiresManagerApproval: z.boolean(),
  isActive: z.boolean(),
});

const updatePolicySchema = z
  .object({
    policyName: z.string().min(1).optional(),
    leaveType: leaveTypeSchema.optional(),
    entitlementDays: z.number().int().min(0).optional(),
    accrualRate: z.number().optional(),
    maxAccumulation: z.number().optional(),
    minimumNoticeDays: z.number().int().optional(),
    requiresManagerApproval: z.boolean().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

export async function policyRoutes(fastify: FastifyInstance): Promise<void> {
  const policies = new PolicyService(
    new PgLeavePolicyRepository(),
    new UnitOfWork(),
  );

  fastify.get(
    '/policies',
    { preHandler: requireRole(UserRole.HR_ADMIN) },
    async (request, reply) => {
      try {
        const result = await policies.list();
        return reply.status(200).send(result);
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Internal Server Error' });
      }
    },
  );

  fastify.get<{ Params: { id: string } }>(
    '/policies/:id',
    { preHandler: requireRole(UserRole.HR_ADMIN) },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const policy = await policies.findById(id);
        if (!policy) {
          return reply.status(404).send({ error: 'Policy not found', code: 'NOT_FOUND' });
        }
        return reply.status(200).send(policy);
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Internal Server Error' });
      }
    },
  );

  fastify.post('/policies', { preHandler: requireRole(UserRole.HR_ADMIN) }, async (request, reply) => {
    try {
      const parsed = createPolicySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: 'Invalid request body', code: 'VALIDATION_ERROR' });
      }
      const input: CreateLeavePolicyInput = {
        policyName: parsed.data.policyName,
        leaveType: parsed.data.leaveType as LeaveType,
        entitlementDays: parsed.data.entitlementDays,
        accrualRate: parsed.data.accrualRate,
        maxAccumulation: parsed.data.maxAccumulation,
        minimumNoticeDays: parsed.data.minimumNoticeDays,
        requiresManagerApproval: parsed.data.requiresManagerApproval,
        isActive: parsed.data.isActive,
      };
      const policy = await policies.create(input);
      return reply.status(201).send(policy);
    } catch (error) {
      if (error instanceof InvalidLeaveTypeError || error instanceof InvalidEntitlementDaysError) {
        return reply.status(400).send({ error: error.message, code: 'VALIDATION_ERROR' });
      }
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  fastify.put<{ Params: { id: string } }>(
    '/policies/:id',
    { preHandler: requireRole(UserRole.HR_ADMIN) },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const parsed = updatePolicySchema.safeParse(request.body);
        if (!parsed.success) {
          return reply.status(400).send({ error: 'Invalid request body', code: 'VALIDATION_ERROR' });
        }
        const changes: Partial<LeavePolicy> = {
          ...parsed.data,
          leaveType: parsed.data.leaveType as LeaveType | undefined,
        };
        const policy = await policies.update(id, changes);
        if (!policy) {
          return reply.status(404).send({ error: 'Policy not found', code: 'NOT_FOUND' });
        }
        return reply.status(200).send(policy);
      } catch (error) {
        if (error instanceof InvalidLeaveTypeError || error instanceof InvalidEntitlementDaysError) {
          return reply.status(400).send({ error: error.message, code: 'VALIDATION_ERROR' });
        }
        request.log.error(error);
        return reply.status(500).send({ error: 'Internal Server Error' });
      }
    },
  );
}
