import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { AppError, UnauthorizedError } from '../../shared/errors';
import { EmployeeRole } from '../../shared/types';
import { Employee } from './employee.model';
import { PgEmployeeRepository } from './employee.repository';
import { EmployeeService } from './employee.service';

interface AuthUser {
  id: string;
  role: EmployeeRole;
}

type EmployeeAuthRequest = FastifyRequest & { user?: AuthUser };

interface EmployeeActor {
  id: string;
  role: EmployeeRole;
}

/**
 * Resolves the authenticated actor from the request. Roles are enforced here
 * at the API boundary (GP-005) before the service is invoked. The caller id is
 * always taken from `request.user`, never from a client-supplied id.
 */
function resolveActor(request: EmployeeAuthRequest): EmployeeActor {
  const user = request.user;
  if (!user || typeof user.id !== 'string' || user.id.trim() === '') {
    throw new UnauthorizedError('Missing authenticated user');
  }
  if (!Object.values(EmployeeRole).includes(user.role)) {
    throw new UnauthorizedError('Invalid user role');
  }
  return { id: user.id, role: user.role };
}

/**
 * Serialize an employee profile for the wire. `passwordHash` is never exposed —
 * this whitelist mirrors the auth module's `toPublicEmployee` field set so both
 * public profiles stay identical.
 */
function toPublicEmployee(employee: Employee): Omit<Employee, 'passwordHash'> {
  return {
    id: employee.id,
    employeeNumber: employee.employeeNumber,
    firstName: employee.firstName,
    lastName: employee.lastName,
    email: employee.email,
    role: employee.role,
    managerId: employee.managerId,
    department: employee.department,
    hireDate: employee.hireDate,
    terminationDate: employee.terminationDate,
    employmentStatus: employee.employmentStatus,
  };
}

function sendError(reply: FastifyReply, error: unknown): FastifyReply {
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({ error: error.message, code: error.code });
  }
  return reply.status(500).send({ error: 'Internal Server Error' });
}

export async function employeeRoutes(fastify: FastifyInstance): Promise<void> {
  const employeeService: EmployeeService =
    (fastify as unknown as { employeeService?: EmployeeService }).employeeService ??
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
