import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { AuditLogService } from '../service/audit-log-service';
import { authenticate } from '../../shared/auth/authenticate';
import { authorize } from '../../shared/auth/authorize';

const querySchema = z.object({
  from: z.string(),
  to: z.string(),
  limit: z.string().transform(Number)
});

/**
 * Registers audit log routes.
 * @param app - Fastify instance.
 * @param service - AuditLogService instance.
 */
export function registerAuditLogRoutes(app: FastifyInstance, service: AuditLogService): void {
  app.get('/api/v1/audit/logs', {
    preHandler: [authenticate, authorize(['admin'])],
    schema: {
      querystring: querySchema
    }
  }, async (request, reply) => {
    const { from, to, limit } = request.query;
    const logs = await service.fetchAuditLogs(from, to, limit);
    reply.send({ logs, pagination: { total: logs.length, limit, from, to } });
  });
}