import { FastifyInstance } from 'fastify';

import { LeaveController } from './leave.controller';
import { createDefaultLeaveService } from './leave.service';

export async function leaveRoutes(fastify: FastifyInstance): Promise<void> {
  const service = createDefaultLeaveService();
  const controller = new LeaveController(service);

  fastify.post('/leave', (request, reply) =>
    controller.submit(request, reply)
  );
  fastify.post('/leave/:id/approve', (request, reply) =>
    controller.approve(request, reply)
  );
  fastify.post('/leave/:id/reject', (request, reply) =>
    controller.reject(request, reply)
  );
  fastify.post('/leave/:id/cancel', (request, reply) =>
    controller.cancel(request, reply)
  );
}
