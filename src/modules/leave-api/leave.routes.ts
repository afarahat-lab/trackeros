import { FastifyInstance } from 'fastify';
import { authenticateJWT, requireRole } from '../auth/auth.middleware';
import { LeaveController } from './leave.controller';
import { LeaveManagementService } from '../leave-management/leave-management.service';

// NOTE: In a production application, use a proper DI container or full repository instantiation.
// The repositories and services are mocked here with `any` to allow compilation without knowing exact DB pool paths.
const leaveRepo: any = {};
const policyRepo: any = {};
const balanceRepo: any = {};
const auditService: any = {};
const employeeRepo: any = {};
const notificationRepo: any = {};
const pool: any = {};

const leaveManagementService = new LeaveManagementService(
  leaveRepo,
  policyRepo,
  balanceRepo,
  auditService,
  employeeRepo,
  notificationRepo,
  pool
);

const leaveController = new LeaveController(leaveManagementService);

export default async function leaveRoutes(app: FastifyInstance) {
  app.post('/api/leave/submit', { preHandler: [authenticateJWT, requireRole('employee')] }, leaveController.submitLeave.bind(leaveController));
  app.put('/api/leave/approve/:id', { preHandler: [authenticateJWT, requireRole('manager')] }, leaveController.approveLeave.bind(leaveController));
  app.put('/api/leave/reject/:id', { preHandler: [authenticateJWT, requireRole('manager')] }, leaveController.rejectLeave.bind(leaveController));
  app.post('/api/leave/cancel/:id', { preHandler: [authenticateJWT, requireRole('employee')] }, leaveController.cancelLeave.bind(leaveController));
  app.delete('/api/leave/draft/:id', { preHandler: [authenticateJWT, requireRole('employee')] }, leaveController.discardDraft.bind(leaveController));
  app.get('/api/leave/balance/:employeeId', { preHandler: [authenticateJWT] }, leaveController.getLeaveBalance.bind(leaveController));
  app.get('/api/leave/history', { preHandler: [authenticateJWT] }, leaveController.getLeaveHistory.bind(leaveController));
}
