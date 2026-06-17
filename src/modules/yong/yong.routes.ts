import { FastifyInstance } from 'fastify';
import { getYongHandler } from './yong.controller';

export function registerYongRoutes(app: FastifyInstance): void {
  app.get('/yong', getYongHandler);
}
