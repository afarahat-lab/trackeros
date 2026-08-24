import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { BalanceService } from './balance.service';
import { BalanceRepository } from './balance.repository';
import { PolicyService } from 'modules/policy';
import { PolicyRepository } from 'modules/policy';
import { BalanceController } from './balance.controller';

const balanceRepo = new BalanceRepository();
const policyRepo = new PolicyRepository();
const policyService = new PolicyService(policyRepo);
const balanceService = new BalanceService(balanceRepo, policyService);
const controller = new BalanceController(balanceService);

export async function balanceRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/balances', async (request: FastifyRequest, reply: FastifyReply) =>
    controller.getBalances(request, reply),
  );

  fastify.get('/balances/:id', async (request: FastifyRequest, reply: FastifyReply) =>
    controller.getBalance(request, reply),
  );
}
