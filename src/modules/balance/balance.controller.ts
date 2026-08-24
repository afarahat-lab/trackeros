import { FastifyRequest, FastifyReply } from 'fastify';
import { BalanceService } from './balance.service';

export class BalanceController {
  constructor(private readonly balanceService: BalanceService) {}

  async getBalances(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const query = request.query as Record<string, unknown>;
    const employeeId = query.employeeId as string | undefined;
    const yearRaw = query.year as string | undefined;

    if (!employeeId || typeof employeeId !== 'string') {
      void reply.status(400).send({
        error: 'VALIDATION_ERROR',
        message: 'employeeId is required',
      });
      return;
    }

    const year = yearRaw ? parseInt(yearRaw, 10) : new Date().getFullYear();
    if (isNaN(year)) {
      void reply.status(400).send({
        error: 'VALIDATION_ERROR',
        message: 'year must be a valid integer',
      });
      return;
    }

    const balances = await this.balanceService.getBalancesForEmployee(
      employeeId,
      year,
    );
    void reply.status(200).send(balances);
  }

  async getBalance(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const params = request.params as { id: string };
    const { id } = params;

    const balance = await this.balanceService.getBalanceById(id);
    if (!balance) {
      void reply.status(404).send({
        error: 'NOT_FOUND',
        message: `Balance not found: ${id}`,
      });
      return;
    }

    void reply.status(200).send(balance);
  }
}
