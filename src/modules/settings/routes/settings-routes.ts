import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { SettingsService } from '../service/settings-service';

const settingsSchema = z.object({
  settings: z.record(z.string())
});

export async function settingsRoutes(fastify: FastifyInstance): Promise<void> {
  const settingsService = new SettingsService();

  fastify.get('/api/v1/settings', {
    preHandler: fastify.auth([fastify.verifyJWT, fastify.verifyRole('operator')]),
    handler: async (request, reply) => {
      const settings = await settingsService.getSettings();
      reply.send({ settings });
    }
  });

  fastify.patch('/api/v1/settings', {
    preHandler: fastify.auth([fastify.verifyJWT, fastify.verifyRole('operator')]),
    handler: async (request, reply) => {
      const validation = settingsSchema.safeParse(request.body);
      if (!validation.success) {
        return reply.status(400).send(validation.error);
      }
      const updatedSettings = await settingsService.updateSettings(validation.data.settings);
      reply.send({ updatedSettings });
    }
  });
}
