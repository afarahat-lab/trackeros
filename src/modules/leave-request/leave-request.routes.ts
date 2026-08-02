import { FastifyInstance } from 'fastify';
import { LeaveRequestController } from './leave-request.controller';
import { LeaveRequestService } from './leave-request.service';
import { LeaveRequestRepository } from './leave-request.repository';
import { LeaveBalanceService } from '../leave-balance/leave-balance.service';
import { LeaveBalanceRepository } from '../leave-balance/leave-balance.repository';
import { EmployeeService } from '../employee/employee.service';
import { EmployeeRepository } from '../employee/employee.repository';
import { LeavePolicyService } from '../leave-policy/leave-policy.service';
import { LeavePolicyRepository } from '../leave-policy/leave-policy.repository';
import { AuditRepository } from '../audit/audit.repository';
import { NotificationService } from '../notification/notification.service';

export async function leaveRequestRoutes(fastify: FastifyInstance): Promise<void> {
  const requestRepo = new LeaveRequestRepository();
  const balanceRepo = new LeaveBalanceRepository();
  const employeeRepo = new EmployeeRepository();
  const policyRepo = new LeavePolicyRepository();
  const auditRepo = new AuditRepository();
  const notificationService = new NotificationService();

  const policyService = new LeavePolicyService(policyRepo);
  const balanceService = new LeaveBalanceService(balanceRepo, policyService);
  const employeeService = new EmployeeService(employeeRepo);

  const leaveRequestService = new LeaveRequestService(
    requestRepo,
    balanceService,
    employeeService,
    policyService,
    auditRepo,
    notificationService,
  );

  const controller = new LeaveRequestController(leaveRequestService);

  fastify.post('/api/leave-requests/:requestId/submit', async (request, reply) =>
    controller.submit(request, reply),
  );

  fastify.post('/api/leave-requests/:requestId/approve', async (request, reply) =>
    controller.approve(request, reply),
  );

  fastify.post('/api/leave-requests/:requestId/reject', async (request, reply) =>
    controller.reject(request, reply),
  );

  fastify.post('/api/leave-requests/:requestId/cancel', async (request, reply) =>
    controller.cancel(request, reply),
  );

  fastify.get('/api/leave-requests/:requestId', async (request, reply) =>
    controller.getById(request, reply),
  );

  fastify.get('/api/leave-requests/my', async (request, reply) =>
    controller.getMyRequests(request, reply),
  );

  fastify.get('/api/leave-requests/pending', async (request, reply) =>
    controller.getPendingForManager(request, reply),
  );
}
