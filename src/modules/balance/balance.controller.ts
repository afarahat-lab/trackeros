import { FastifyRequest, FastifyReply } from 'fastify';
import { ILeaveBalanceService } from './balance.service';
import { z } from 'zod';

const initializeBalanceSchema = z.object({
  employeeId: z.string().uuid(),
  policyId: z.string().uuid(),
  fiscalYear: z.number().int().min(2000)
});

export class BalanceController {
  constructor(private readonly balanceService: ILeaveBalanceService) {}

  async getBalances(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const balances = await this.balanceService.getAllBalances();
      reply.status(200).send(balances);
    } catch (error: any) {
      reply.status(500).send({ error: error.message || 'Internal Server Error' });
    }
  }

  async getBalancesByEmployee(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { employeeId } = request.params as { employeeId: string };
      const balances = await this.balanceService.getBalancesByEmployee(employeeId);
      reply.status(200).send(balances);
    } catch (error: any) {
      reply.status(500).send({ error: error.message || 'Internal Server Error' });
    }
  }

  async initializeBalance(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const body = initializeBalanceSchema.parse(request.body);
      const balance = await this.balanceService.initializeBalance(body.employeeId, body.policyId, body.fiscalYear);
      reply.status(201).send(balance);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        reply.status(400).send({ error: 'Validation failed', details: error.errors });
        return;
      }
      reply.status(500).send({ error: error.message || 'Internal Server Error' });
    }
  }
}
