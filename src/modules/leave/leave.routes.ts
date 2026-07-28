import { FastifyInstance, FastifyPluginOptions } from 'fastify';

export async function leaveRoutes(
  app: FastifyInstance,
  _opts: FastifyPluginOptions,
): Promise<void> {
  // Phase 7 will add the actual leave endpoints here.
  // This placeholder exists so Phase 8 can register the plugin.
}
