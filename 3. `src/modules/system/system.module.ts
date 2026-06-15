import { FastifyPluginAsync } from 'fastify';
import { SystemService } from './system.service';

export const systemModule: FastifyPluginAsync = async (fastify) => {
  const systemService = new SystemService();
  
  fastify.get('/pid', async (request, reply) => {
    const processInfo = await systemService.getProcessInfo();
    return processInfo;
  });
};
