import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { LeaveRequestService } from '../service/leave-request-service';
import { auditLog } from '../../shared/utils/audit-log';
import { rbacMiddleware } from '../../shared/auth/rbac-middleware';

const leaveRequestSchema = z.object({
  employeeId: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  reason: z.string(),
  status: z.enum(['pending', 'approved', 'rejected'])
});

export async function leaveRequestRoutes(fastify: FastifyInstance): Promise<void> {
  const service = new LeaveRequestService();

  fastify.post('/api/v1/leave-requests', { preHandler: rbacMiddleware(['admin', 'operator']) }, async (request, reply) => {
    const validation = leaveRequestSchema.safeParse(request.body);
    if (!validation.success) {
      return reply.status(400).send(validation.error);
    }

    const leaveRequest = await service.createLeaveRequest(validation.data);
    await auditLog.append({ action: 'create', entity: 'LeaveRequest', entityId: leaveRequest.id });
    return reply.status(201).send(leaveRequest);
  });

  fastify.get('/api/v1/leave-requests', { preHandler: rbacMiddleware(['admin', 'operator']) }, async (request, reply) => {
    const status = request.query.status as 'pending' | 'approved' | 'rejected' | undefined;
    const leaveRequests = await service.listLeaveRequests(status);
    return reply.send({ leaveRequests });
  });
}
