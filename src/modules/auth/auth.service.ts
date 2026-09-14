import bcrypt from 'bcrypt';
import { NotFoundError, UnauthorizedError } from '../../shared/errors';
import { signToken } from '../../shared/auth';
import {
  Employee,
  EmployeeService,
  IEmployeeService,
  PgEmployeeRepository,
} from '../employee';

/** Employee profile as it may be returned in a response body — never the password hash. */
export type PublicEmployee = Omit<Employee, 'passwordHash'>;

export interface LoginResult {
  token: string;
  employee: PublicEmployee;
}

export interface IAuthService {
  login(email: string, password: string): Promise<LoginResult>;
}

function toPublicEmployee(employee: Employee): PublicEmployee {
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

export class AuthService implements IAuthService {
  constructor(private readonly employeeService: IEmployeeService) {}

  async login(email: string, password: string): Promise<LoginResult> {
    let employee: Employee;
    try {
      employee = await this.employeeService.getEmployeeByEmail(email);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw new UnauthorizedError('Invalid email or password');
      }
      throw error;
    }

    if (employee.passwordHash === null) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const matches = await bcrypt.compare(password, employee.passwordHash);
    if (!matches) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const token = signToken({ id: employee.id, role: employee.role });
    return { token, employee: toPublicEmployee(employee) };
  }
}

export function createAuthService(): IAuthService {
  return new AuthService(new EmployeeService(new PgEmployeeRepository()));
}
