import { FastifyReply, FastifyRequest } from 'fastify';
import { BalanceService } from './balance.service';

export class BalanceController {
  constructor(private readonly balanceService: BalanceService) {}

  getBalance = async (
    request: FastifyRequest<{ Params: { employeeId: string; leaveType: string } }>,
    reply: FastifyReply,
  ): Promise<void> => {
    try {
      const { employeeId, leaveType } = request.params;
      const balance = await this.balanceService.getBalance(employeeId, leaveType);

      if (balance === null) {
        await reply.status(404).send({
          error: 'Not Found',
          message: `Balance not found for employee ${employeeId} and leave type ${leaveType}`,
        });
        return;
      }

      await reply.status(200).send(balance);
    } catch (error) {
      request.log.error(error);
      await reply.status(500).send({ error: 'Internal Server Error' });
    }
  };

  getBalances = async (
    request: FastifyRequest<{ Params: { employeeId: string } }>,
    reply: FastifyReply,
  ): Promise<void> => {
    try {
      const { employeeId } = request.params;
      const balances = await this.balanceService.getBalances(employeeId);

      await reply.status(200).send(balances);
    } catch (error) {
      request.log.error(error);
      await reply.status(500).send({ error: 'Internal Server Error' });
    }
  };
}
