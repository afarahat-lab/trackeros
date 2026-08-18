
import { FastifyInstance } from 'fastify';
import { LeaveRequestRepository } from './leave-request.repository';
import { LeaveRequestService } from './leave-request.service';
import { LeaveRequestController } from './leave-request.controller';
import { EmployeeRepository } from 'modules/employee';
import { EmployeeService } from 'modules/employee';
import { LeavePolicyRepository } from 'modules/leave-policy';
import { LeavePolicyService } from 'modules/leave-policy';
import { LeaveBalanceRepository } from 'modules/balance';
import { LeaveBalanceService } from 'modules/balance';

export default async function leaveRequestRoutes(fastify: FastifyInstance): Promise<void> {
  const leaveRequestRepository = new LeaveRequestRepository();
  const employeeRepository = new EmployeeRepository();
  const leavePolicyRepository = new LeavePolicyRepository();
  const leaveBalanceRepository = new LeaveBalanceRepository();

  const employeeService = new EmployeeService(employeeRepository);
  const leavePolicyService = new LeavePolicyService(leavePolicyRepository);
  const leaveBalanceService = new LeaveBalanceService(leaveBalanceRepository);

  const leaveRequestService = new LeaveRequestService(
    leaveRequestRepository,
    employeeService,
    leavePolicyService,
    leaveBalanceService,
  );

  const controller = new LeaveRequestController(leaveRequestService);

  fastify.post('/leave-requests', controller.createLeaveRequest);
  fastify.post('/leave-requests/:id/submit', controller.submitLeaveRequest);
  fastify.post('/leave-requests/:id/approve', controller.approveLeaveRequest);
  fastify.post('/leave-requests/:id/reject', controller.rejectLeaveRequest);
  fastify.post('/leave-requests/:id/cancel', controller.cancelLeaveRequest);
  fastify.put('/leave-requests/:id', controller.updateLeaveRequest);
  fastify.get('/leave-requests/:id', controller.getLeaveRequest);
  fastify.get('/leave-requests', controller.queryLeaveRequests);
}
