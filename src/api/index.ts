import { FastifyInstance } from 'fastify';
import { registerHelloRoutes } from '../modules/hello';

/**
 * Registers all application routes.
 * @param app - The Fastify instance.
 */
export const registerRoutes = (app: FastifyInstance): void => {
  registerHelloRoutes(app);
};
