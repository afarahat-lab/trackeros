import { FastifyInstance } from 'fastify';
import { ILeaveManagementService } from '../leave-management/leave-management.service.interface';
import { LeaveController } from './leave.controller';
import { authenticateJWT, requireRole } from '../auth/auth.middleware';

export const registerLeaveRoutes = async (
  fastify: FastifyInstance,
  leaveService: ILeaveManagementService
) => {
  const controller = new LeaveController(leaveService);

  fastify.post('/api/leave/submit', {
    preHandler: [authenticateJWT, requireRole('employee')],
    handler: controller.submit,
  });

  fastify.put('/api/leave/approve/:id', {
    preHandler: [authenticateJWT, requireRole('manager')],
    handler: controller.approve,
  });

  fastify.put('/api/leave/reject/:id', {
    preHandler: [authenticateJWT, requireRole('manager')],
    handler: controller.reject,
  });

  fastify.put('/api/leave/cancel/:id', {
    preHandler: [authenticateJWT, requireRole('employee')],
    handler: controller.cancel,
  });

  fastify.delete('/api/leave/discard-draft/:id', {
    preHandler: [authenticateJWT, requireRole('employee')],
    handler: controller.discard,
  });

  fastify.get('/api/leave/history', {
    preHandler: [authenticateJWT, requireRole('employee')],
    handler: controller.history,
  });

  fastify.get('/api/leave/balances', {
    preHandler: [authenticateJWT, requireRole('employee')],
    handler: controller.balances,
  });
};
