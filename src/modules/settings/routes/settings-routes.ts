import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { SettingsService } from '../service/settings-service';
import { authMiddleware } from '../../shared/auth/auth-middleware';

const settingsSchema = z.object({
  settings: z.record(z.string()).partial()
});

export async function settingsRoutes(fastify: FastifyInstance) {
  const service = new SettingsService();

  fastify.get('/api/v1/settings', { preHandler: [authMiddleware(['operator'])] }, async (request, reply) => {
    const settings = await service.getSettings();
    reply.send({ settings });
  });

  fastify.patch('/api/v1/settings', { preHandler: [authMiddleware(['operator'])] }, async (request, reply) => {
    const { settings } = settingsSchema.parse(request.body);
    const updatedSettings = await service.updateSettings(settings, request.user.id);
    reply.send({ updatedSettings });
  });
}
