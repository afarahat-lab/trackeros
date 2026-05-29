import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { SettingsService } from '../service/settings-service';
import { authenticate } from '../../shared/auth/authenticate';
import { authorize } from '../../shared/auth/authorize';

const settingsSchema = z.object({
  settings: z.record(z.string(), z.string())
});

const updateSettingsSchema = z.object({
  settings: z.record(z.string(), z.string()).partial()
});

export async function registerSettingsRoutes(app: FastifyInstance): Promise<void> {
  const service = new SettingsService();

  app.get('/api/v1/settings', {
    preHandler: [authenticate, authorize(['operator'])],
    schema: {
      response: {
        200: settingsSchema
      }
    }
  }, async (request, reply) => {
    const settings = await service.getSettings();
    reply.send({ settings });
  });

  app.patch('/api/v1/settings', {
    preHandler: [authenticate, authorize(['operator'])],
    schema: {
      body: updateSettingsSchema,
      response: {
        200: z.object({ success: z.boolean() })
      }
    }
  }, async (request, reply) => {
    const { settings } = updateSettingsSchema.parse(request.body);
    await service.updateSettings(settings, request.user.id);
    reply.send({ success: true });
  });
}
