import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { auditLog } from '../../../shared/utils/audit-log';
import { validateRequest } from '../../../shared/utils/validate-request';
import { rbacMiddleware } from '../../../shared/auth/rbac-middleware';

/**
 * Zod schema for validating request body.
 */
const agentSchema = z.object({
  name: z.string(),
  role: z.string()
});

/**
 * Registers agent-related routes.
 *
 * @param app - The Fastify instance.
 */
export const registerAgentRoutes = (app: FastifyInstance): void => {
  app.post('/agents', {
    preHandler: rbacMiddleware(['admin']),
    schema: {
      body: agentSchema
    }
  }, async (request, reply) => {
    const validationResult = validateRequest(agentSchema, request.body);
    if (!validationResult.success) {
      return reply.status(400).send(validationResult.error);
    }

    const { name, role } = request.body;
    // Business logic to create an agent would go here

    // Append to audit log
    await auditLog.append({
      action: 'create_agent',
      user: request.user,
      details: { name, role }
    });

    reply.status(201).send({ message: 'Agent created successfully' });
  });
};
