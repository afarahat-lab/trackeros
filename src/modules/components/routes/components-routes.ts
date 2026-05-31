import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ComponentsService } from '../service/components-service';
import { auditLog } from '../../../shared/utils/audit-log';
import { validateRequest } from '../../../shared/utils/validate-request';

const componentSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  props: z.any(), // Replace with actual Props schema
  typeId: z.string()
});

/**
 * Registers component routes.
 */
export async function registerComponentRoutes(app: FastifyInstance, service: ComponentsService): Promise<void> {
  app.get('/api/v1/components', {
    preHandler: [app.authenticate, app.authorize(['admin', 'operator'])],
    schema: {
      response: {
        200: z.array(componentSchema)
      }
    }
  }, async (request, reply) => {
    const components = await service.getAllComponents();
    await auditLog.append('Retrieved all components', { userId: request.user.id });
    reply.send({ components });
  });

  app.post('/api/v1/components', {
    preHandler: [app.authenticate, app.authorize(['admin'])],
    schema: {
      body: componentSchema,
      response: {
        201: componentSchema
      }
    }
  }, async (request, reply) => {
    const validatedBody = validateRequest(request.body, componentSchema);
    const component = await service.createComponent(validatedBody);
    await auditLog.append('Created a new component', { userId: request.user.id, componentId: component.id });
    reply.code(201).send({ component });
  });
}
