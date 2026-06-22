import { LeaveController } from './leave.controller';
import {
  applyLeaveSchema,
  approveLeaveSchema,
  rejectLeaveSchema,
  cancelLeaveSchema,
  getLeaveRequestSchema,
  getLeaveRequestsSchema,
  getLeaveBalanceSchema
} from './leave.schemas';

interface FastifyInstance {
  post(path: string, opts: any, handler: any): void;
  put(path: string, opts: any, handler: any): void;
  get(path: string, opts: any, handler: any): void;
  authenticate: any;
  authorize: (role: string) => any;
}

export function registerLeaveRoutes(fastify: FastifyInstance, leaveController: LeaveController): void {
  fastify.post('/apply', {
    schema: applyLeaveSchema,
    preHandler: [fastify.authenticate, fastify.authorize('employee')]
  }, leaveController.applyLeave.bind(leaveController));

  fastify.put('/approve/:id', {
    schema: approveLeaveSchema,
    preHandler: [fastify.authenticate, fastify.authorize('manager')]
  }, leaveController.approveLeave.bind(leaveController));

  fastify.put('/reject/:id', {
    schema: rejectLeaveSchema,
    preHandler: [fastify.authenticate, fastify.authorize('manager')]
  }, leaveController.rejectLeave.bind(leaveController));

  fastify.put('/cancel/:id', {
    schema: cancelLeaveSchema,
    preHandler: [fastify.authenticate, fastify.authorize('employee')]
  }, leaveController.cancelLeave.bind(leaveController));

  fastify.get('/:id', {
    schema: getLeaveRequestSchema,
    preHandler: [fastify.authenticate]
  }, leaveController.getLeaveRequest.bind(leaveController));

  fastify.get('/', {
    schema: getLeaveRequestsSchema,
    preHandler: [fastify.authenticate]
  }, leaveController.getLeaveRequests.bind(leaveController));

  fastify.get('/balance', {
    schema: getLeaveBalanceSchema,
    preHandler: [fastify.authenticate]
  }, leaveController.getLeaveBalance.bind(leaveController));
}
