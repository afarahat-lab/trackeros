import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { UnitOfWork } from '../../shared/db/unit-of-work.impl';
import { requireRole } from '../../shared/http/require-role';
import { EntityType, UserRole } from '../../shared/types';
import { AuditLogQuery } from './audit.model';
import { PgAuditLogRepository } from './audit.repository';
import { AuditService } from './audit.service';

const auditLogQuerySchema = z.object({
  entityType: z.enum([
    EntityType.LEAVE_REQUEST,
    EntityType.LEAVE_BALANCE,
    EntityType.LEAVE_POLICY,
    EntityType.EMPLOYEE,
    EntityType.NOTIFICATION,
  ]).optional(),
  entityId: z.string().optional(),
  performedBy: z.string().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export async function auditRoutes(fastify: FastifyInstance): Promise<void> {
  const service = new AuditService(new PgAuditLogRepository(), new UnitOfWork());

  fastify.get<{ Querystring: Record<string, unknown> }>(
    '/audit-logs',
    { preHandler: requireRole(UserRole.HR_ADMIN) },
    async (request, reply) => {
      try {
        const parsed = auditLogQuerySchema.safeParse(request.query);
        if (!parsed.success) {
          return reply.status(400).send({
            error: 'Invalid query parameters',
            code: 'VALIDATION_ERROR',
          });
        }

        const query: AuditLogQuery = {
          entityType: parsed.data.entityType,
          entityId: parsed.data.entityId,
          performedBy: parsed.data.performedBy,
          from: parsed.data.from,
          to: parsed.data.to,
        };

        const result = await service.query(query);
        return reply.status(200).send(result);
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({
          error: 'Internal Server Error',
          code: 'INTERNAL_ERROR',
        });
      }
    },
  );
}
