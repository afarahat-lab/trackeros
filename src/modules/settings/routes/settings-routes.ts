import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { SettingsService } from '../service/settings-service';
import { authenticate, authorize } from '../../shared/auth/middleware';

const settingsSchema = z.object({
  settings: z.record(z.string())
});

export async function registerSettingsRoutes(app: FastifyInstance): Promise<void> {
  const service = new SettingsService();

  app.get('/api/v1/settings', {
    preHandler: [authenticate, authorize(['operator'])]
  }, async (request, reply) => {
    const settings = await service.getSettings();
    reply.send({ settings });
  });

  app.patch('/api/v1/settings', {
    preHandler: [authenticate, authorize(['operator'])],
    schema: { body: settingsSchema }
  }, async (request, reply) => {
    const { settings } = settingsSchema.parse(request.body);
    const success = await service.updateSettings(settings, request.user.id);
    reply.send({ success });
  });
}
