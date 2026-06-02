import fastify from 'fastify';
import { registerRoutes } from './routes';

/**
 * Creates and configures the Fastify server instance.
 * @returns {Promise<fastify.FastifyInstance>} Configured Fastify server instance
 */
export const createServer = async (): Promise<fastify.FastifyInstance> => {
  const server = fastify();

  // Register routes
  registerRoutes(server);

  return server;
};