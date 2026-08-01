import { FastifyInstance, FastifyRequest } from 'fastify';
import { LeaveRepository } from './leave.repository';
import { LeaveService } from './leave.service';
import { BalanceRepository } from '../balance/balance.repository';
import { EmployeeRepository } from '../employee/employee.repository';
import { PolicyRepository } from '../policy/policy.repository';
import { NotificationRepository } from '../notification/notification.repository';
import { AuditRepository } from '../audit/audit.repository';
import { LeaveController } from './leave.controller';

declare module 'fastify' {
  interface FastifyRequest {
    user?: Record<string, unknown>;
  }
}

function populateUserFromHeaders(request: FastifyRequest): void {
  if (!request.user) {
    const userId = request.headers['x-user-id'];
    const userRole = request.headers['x-user-role'];
    if (userId || userRole) {
      request.user = {
        id: typeof userId === 'string' ? userId : undefined,
        role: typeof userRole === 'string' ? userRole : undefined,
      };
    }
  }
}

export async function leaveRoutes(fastify: FastifyInstance): Promise<void> {
  const leaveRepository = new LeaveRepository();
  const balanceRepository = new BalanceRepository();
  const employeeRepository = new EmployeeRepository();
  const policyRepository = new PolicyRepository();
  const notificationRepository = new NotificationRepository();
  const auditRepository = new AuditRepository();

  const leaveService = new LeaveService(
    leaveRepository,
    balanceRepository,
    employeeRepository,
    policyRepository,
    notificationRepository,
    auditRepository,
  );

  const controller = new LeaveController(leaveService);

  fastify.addHook('preHandler', async (request) => {
    populateUserFromHeaders(request);
  });

  fastify.post('/api/leave/requests', (request, reply) => controller.submit(request, reply));
  fastify.get('/api/leave/requests/:requestId', (request, reply) => controller.getById(request, reply));
  fastify.get('/api/leave/employees/:employeeId/requests', (request, reply) => controller.getByEmployee(request, reply));
  fastify.post('/api/leave/requests/:requestId/approve', (request, reply) => controller.approve(request, reply));
  fastify.post('/api/leave/requests/:requestId/reject', (request, reply) => controller.reject(request, reply));
  fastify.post('/api/leave/requests/:requestId/cancel', (request, reply) => controller.cancel(request, reply));
}
