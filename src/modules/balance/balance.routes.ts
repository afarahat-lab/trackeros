import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { AppError, UnauthorizedError } from '../../shared/errors';
import { EmployeeRole } from '../../shared/types';
import { PgUnitOfWork } from '../../shared/db';
import { EmployeeService, PgEmployeeRepository } from '../employee';
import { PolicyService, PgLeavePolicyRepository } from '../policy';
import { LeaveTypeService, PgLeaveTypeRepository } from '../leave-type';
import { IBalanceService, BalanceService } from './balance.service';
import { PgLeaveBalanceRepository } from './balance.repository';

interface AuthUser {
  id: string;
  role: EmployeeRole;
}

type BalanceAuthRequest = FastifyRequest & { user?: AuthUser };

/**
 * Resolves the authenticated actor from the request. Roles are enforced here at
 * the API boundary (GP-005) before the service is invoked.
 */
function resolveActor(request: BalanceAuthRequest): { id: string; role: EmployeeRole } {
  const user = request.user;
  if (!user || typeof user.id !== 'string' || user.id.trim() === '') {
    throw new UnauthorizedError('Missing authenticated user');
  }
  if (!Object.values(EmployeeRole).includes(user.role)) {
    throw new UnauthorizedError('Invalid user role');
  }
  return { id: user.id, role: user.role };
}

function sendError(reply: FastifyReply, error: unknown): FastifyReply {
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({ error: error.message, code: error.code });
  }
  return reply.status(500).send({ error: 'Internal Server Error' });
}

export function createBalanceService(): IBalanceService {
  return new BalanceService(
    new PgLeaveBalanceRepository(),
    new EmployeeService(new PgEmployeeRepository()),
    new PolicyService(new PgLeavePolicyRepository(), new LeaveTypeService(new PgLeaveTypeRepository())),
    new PgUnitOfWork(),
  );
}

export async function balanceRoutes(fastify: FastifyInstance): Promise<void> {
  const balanceService: IBalanceService =
    (fastify as unknown as { balanceService?: IBalanceService }).balanceService ??
    createBalanceService();

  fastify.get('/balances/me', async (request: BalanceAuthRequest, reply) => {
    try {
      const actor = resolveActor(request);
      const balances = await balanceService.getBalanceForEmployee(actor.id);
      return reply.status(200).send(balances);
    } catch (error) {
      request.log.error(error);
      return sendError(reply, error);
    }
  });
}
