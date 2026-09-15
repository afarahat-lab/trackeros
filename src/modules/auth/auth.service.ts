import bcrypt from 'bcrypt';
import { signToken } from '../../shared/auth';
import { NotFoundError, UnauthorizedError } from '../../shared/errors';
import { EmployeeProfile } from '../../shared/types';
import { EmployeeService, IEmployeeService, PgEmployeeRepository } from '../employee';

export interface IAuthService {
  login(email: string, password: string): Promise<{ token: string; profile: EmployeeProfile }>;
}

export class AuthService implements IAuthService {
  constructor(private readonly employeeService: IEmployeeService) {}

  async login(
    email: string,
    password: string,
  ): Promise<{ token: string; profile: EmployeeProfile }> {
    let employee;
    try {
      employee = await this.employeeService.getEmployeeByEmail(email);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw new UnauthorizedError('Invalid email or password');
      }
      throw error;
    }

    const valid = await bcrypt.compare(password, employee.passwordHash ?? '');
    if (!valid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const profile: EmployeeProfile = {
      id: employee.id,
      employeeNumber: employee.employeeNumber,
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      role: employee.role,
      managerId: employee.managerId,
      department: employee.department,
      hireDate: employee.hireDate,
      employmentStatus: employee.employmentStatus,
    };

    return {
      token: signToken({ id: employee.id, role: employee.role }),
      profile,
    };
  }
}

/**
 * Convenience factory wiring the concrete PostgreSQL-backed collaborator the
 * routes layer needs so route handlers construct a single service instance.
 */
export function createAuthService(): IAuthService {
  return new AuthService(new EmployeeService(new PgEmployeeRepository()));
}
