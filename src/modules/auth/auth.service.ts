import bcrypt from 'bcrypt';
import { Employee, IEmployeeRepository } from '../employee';
import { signToken } from '../../shared/auth';
import { UnauthorizedError } from '../../shared/errors';

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginResult {
  token: string;
  employee: Omit<Employee, 'passwordHash'>;
}

export interface IAuthService {
  login(input: LoginInput): Promise<LoginResult>;
}

export class AuthService implements IAuthService {
  constructor(private readonly employeeRepository: IEmployeeRepository) {}

  async login(input: LoginInput): Promise<LoginResult> {
    const employee = await this.employeeRepository.findByEmail(input.email);

    // A missing account and a wrong password must be indistinguishable, so both
    // short-circuit to the same 401 before any bcrypt comparison is observed.
    if (!employee || employee.passwordHash === null) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const valid = await bcrypt.compare(input.password, employee.passwordHash);
    if (!valid) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const token = signToken({ id: employee.id, role: employee.role });

    // Never expose the credential hash to a caller.
    const { passwordHash: _passwordHash, ...employeeWithoutHash } = employee;
    return { token, employee: employeeWithoutHash };
  }
}
