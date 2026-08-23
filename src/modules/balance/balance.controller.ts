import { FastifyRequest, FastifyReply } from 'fastify';
import { BalanceService } from './balance.service';
import { BalanceNotFoundError } from './balance.model';

interface GetBalancesQuery {
  employeeId?: string;
  year?: string;
}

interface GetBalanceParams {
  id: string;
}

export class BalanceController {
  constructor(private readonly balanceService: BalanceService) {}

  getBalances = async (
    request: FastifyRequest<{ Querystring: GetBalancesQuery }>,
    reply: FastifyReply
  ): Promise<unknown> => {
    try {
      const { employeeId, year } = request.query;

      if (!employeeId || typeof employeeId !== 'string') {
        return reply.status(400).send({
          error: 'employeeId query parameter is required',
          code: 'VALIDATION_ERROR',
        });
      }

      const fiscalYear = year ? parseInt(year, 10) : new Date().getFullYear();

      if (isNaN(fiscalYear)) {
        return reply.status(400).send({
          error: 'year must be a valid integer',
          code: 'VALIDATION_ERROR',
        });
      }

      const balances = await this.balanceService.getBalancesForEmployee(
        employeeId,
        fiscalYear
      );

      return reply.status(200).send(balances);
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  };

  getBalance = async (
    request: FastifyRequest<{ Params: GetBalanceParams }>,
    reply: FastifyReply
  ): Promise<unknown> => {
    try {
      const { id } = request.params;

      const balance = await this.balanceService.getById(id);

      return reply.status(200).send(balance);
    } catch (error) {
      if (error instanceof BalanceNotFoundError) {
        return reply.status(404).send({
          error: error.message,
          code: 'NOT_FOUND',
        });
      }
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  };
}
