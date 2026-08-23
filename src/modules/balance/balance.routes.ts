import { FastifyInstance } from 'fastify';
import { BalanceController } from './balance.controller';
import { BalanceService } from './balance.service';
import { BalanceRepository } from './balance.repository';
import { PolicyService, PolicyRepository } from 'modules/policy';

export async function balanceRoutes(fastify: FastifyInstance): Promise<void> {
  const balanceRepo = new BalanceRepository();
  const policyRepo = new PolicyRepository();
  const policyService = new PolicyService(policyRepo);
  const balanceService = new BalanceService(balanceRepo, policyService);
  const controller = new BalanceController(balanceService);

  fastify.get('/balances', controller.getBalances);
  fastify.get('/balances/:id', controller.getBalance);
}
