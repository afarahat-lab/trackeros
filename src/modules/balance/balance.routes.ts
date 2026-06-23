import { FastifyInstance } from 'fastify';
import { BalanceController } from './balance.controller';
import { ILeaveBalanceService } from './balance.service';

// Placeholder for RBAC preHandler logic
const requireRole = (roles: string[]) => async (request: any, reply: any) => {
  const userRole = request.user?.role;
  if (!roles.includes(userRole)) {
    reply.status(403).send({ error: 'Forbidden' });
  }
};

export function balanceRoutes(fastify: FastifyInstance, balanceService: ILeaveBalanceService) {
  const controller = new BalanceController(balanceService);

  fastify.get('/balances', { preHandler: requireRole(['admin']) }, controller.getBalances.bind(controller));
  fastify.get('/balances/:employeeId', { preHandler: requireRole(['employee', 'manager', 'admin']) }, controller.getBalancesByEmployee.bind(controller));
  fastify.post('/balances/initialize', { preHandler: requireRole(['admin']) }, controller.initializeBalance.bind(controller));
}
