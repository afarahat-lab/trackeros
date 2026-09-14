import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { AppError, UnauthorizedError } from '../../shared/errors';
import { EmployeeRole } from '../../shared/types';
import { Employee } from './employee.model';
import { IEmployeeService } from './employee.service.interface';
import { EmployeeService } from './employee.service';
import { PgEmployeeRepository } from './employee.repository';

interface AuthUser {
  id: string;
  role: EmployeeRole;
}

type EmployeeAuthRequest = FastifyRequest & { user?: AuthUser };

/** Employee profile as returned in a response body — never the password hash. */
export type PublicEmployee = Omit<Employee, 'passwordHash'>;

/**
 * Resolves the authenticated actor from the request. Roles are enforced here
 * at the API boundary (GP-005) before the service is invoked.
 */
function resolveActor(request: EmployeeAuthRequest): AuthUser {
  const user = request.user;
  if (!user || typeof user.id !== 'string' || user.id.trim() === '') {
    throw new UnauthorizedError('Missing authenticated user');
  }
  if (!Object.values(EmployeeRole).includes(user.role)) {
    throw new UnauthorizedError('Invalid user role');
  }
  return { id: user.id, role: user.role };
}

function toPublicEmployee(employee: Employee): PublicEmployee {
  const { passwordHash: _passwordHash, ...rest } = employee;
  return rest;
}

function sendError(reply: FastifyReply, error: unknown): FastifyReply {
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({ error: error.message, code: error.code });
  }
  return reply.status(500).send({ error: 'Internal Server Error' });
}

export async function employeeRoutes(fastify: FastifyInstance): Promise<void> {
  const employeeService: IEmployeeService =
    (fastify as unknown as { employeeService?: IEmployeeService }).employeeService ??
    new EmployeeService(new PgEmployeeRepository());

  fastify.get('/employees/me', async (request: EmployeeAuthRequest, reply) => {
    try {
      const actor = resolveActor(request);
      const employee = await employeeService.getEmployeeById(actor.id);
      return reply.status(200).send(toPublicEmployee(employee));
    } catch (error) {
      request.log.error(error);
      return sendError(reply, error);
    }
  });
}
