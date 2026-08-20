import { FastifyInstance } from 'fastify';
import { BalanceController } from './balance.controller';
import { BalanceService } from './balance.service';
import { PgBalanceRepository } from './balance.repository';

export async function balanceRoutes(fastify: FastifyInstance): Promise<void> {
  const repository = new PgBalanceRepository();
  const service = new BalanceService(repository);
  const controller = new BalanceController(service);

  fastify.get(
    '/balance/:employeeId/:leaveType',
    controller.getBalance,
  );

  fastify.get(
    '/balance/:employeeId',
    controller.getBalances,
  );
}
