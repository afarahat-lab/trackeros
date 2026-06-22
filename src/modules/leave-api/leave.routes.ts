import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { LeaveController } from './leave.controller';
import { ILeaveManagementService } from '../leave-management/leave-management.service.interface';

export default async function leaveRoutes(
  fastify: FastifyInstance,
  opts: { leaveService: ILeaveManagementService }
) {
  const controller = new LeaveController(opts.leaveService);

  fastify.post('/api/leaves', async (request: FastifyRequest, reply: FastifyReply) => {
    return controller.submitLeaveRequest(request, reply);
  });

  // Type the route params generic
  fastify.get<{ Params: { id: string } }>('/api/leaves/:id', async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) => {
    return controller.getLeaveRequestById(request, reply);
  });
}
