import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { auditLog } from '../../../shared/utils/audit-log';
import { validateRequestBody } from '../../../shared/utils/validation';
import { rbacMiddleware } from '../../../shared/auth/rbac-middleware';

const agentSchema = z.object({
  name: z.string(),
  role: z.string()
});

/**
 * Registers agent routes with the given Fastify instance.
 *
 * @param app - The Fastify instance.
 */
export const registerAgentRoutes = (app: FastifyInstance): void => {
  app.post('/agents', {
    preHandler: rbacMiddleware(['admin']),
    handler: async (request, reply) => {
      const validationResult = validateRequestBody(agentSchema, request.body);
      if (!validationResult.success) {
        return reply.status(400).send({ error: validationResult.error });
      }

      const { name, role } = validationResult.data;

      // Business logic to create an agent would go here

      await auditLog.append({
        action: 'create_agent',
        details: { name, role },
        userId: request.user.id
      });

      reply.status(201).send({ message: 'Agent created successfully' });
    }
  });
};