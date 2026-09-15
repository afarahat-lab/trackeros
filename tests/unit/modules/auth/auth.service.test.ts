import bcrypt from 'bcrypt';
import { AuthService } from '../../../../src/modules/auth';
import { Employee, IEmployeeService } from '../../../../src/modules/employee';
import { NotFoundError, UnauthorizedError } from '../../../../src/shared/errors';
import { EmployeeRole, EmploymentStatus } from '../../../../src/shared/types';

function makeEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
    id: 'emp-1',
    employeeNumber: 'EMP-001',
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.com',
    role: EmployeeRole.EMPLOYEE,
    managerId: null,
    department: 'Engineering',
    hireDate: new Date('2020-01-01T00:00:00.000Z'),
    terminationDate: null,
    employmentStatus: EmploymentStatus.ACTIVE,
    passwordHash: null,
    ...overrides,
  };
}

describe('AuthService.login', () => {
  const CORRECT_PASSWORD = 'correct-horse-battery-staple';

  // Test-only password hashed at low cost so bcrypt.compare stays fast —
  // it authenticates nothing real, so no production secret lives in source.
  const employee: Employee = makeEmployee({
    role: EmployeeRole.MANAGER,
    passwordHash: bcrypt.hashSync(CORRECT_PASSWORD, 4),
  });

  function serviceWith(
    getEmployeeByEmail: (email: string) => Promise<Employee>,
  ): AuthService {
    // Implement the full IEmployeeService seam so this is a faithful fake rather
    // than a partial object behind an `as unknown as` assertion. login only calls
    // getEmployeeByEmail; the remaining methods are unreachable stubs.
    const employeeService: IEmployeeService = {
      createEmployee: async () => {
        throw new Error('createEmployee is not exercised by AuthService.login');
      },
      getEmployeeById: async () => {
        throw new Error('getEmployeeById is not exercised by AuthService.login');
      },
      getEmployeeByEmail,
      getEmployeesByManagerId: async () => {
        throw new Error('getEmployeesByManagerId is not exercised by AuthService.login');
      },
      getEmployeeProfileById: async () => {
        throw new Error('getEmployeeProfileById is not exercised by AuthService.login');
      },
    };
    return new AuthService(employeeService);
  }

  // Capture the prior value so the success-path token assertion can run against a
  // known secret without leaking it into any later test file in the same Jest process.
  const originalJwtSecret = process.env.JWT_SECRET;

  beforeAll(() => {
    process.env.JWT_SECRET = 'unit-test-jwt-secret';
  });

  afterAll(() => {
    // Restore the exact prior state: when JWT_SECRET was unset, assigning the
    // undefined captured value would coerce it to the string "undefined" and leak a
    // bogus secret into every later test file in the same Jest process.
    if (originalJwtSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = originalJwtSecret;
    }
  });

  it('returns a token and a profile (never passwordHash) on correct credentials', async () => {
    const service = serviceWith(jest.fn(async () => employee));

    const { token, profile } = await service.login(employee.email, CORRECT_PASSWORD);

    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
    expect(profile.id).toBe(employee.id);
    expect(profile.employeeNumber).toBe(employee.employeeNumber);
    expect(profile.email).toBe(employee.email);
    expect(profile.role).toBe(employee.role);
    expect(profile.managerId).toBe(employee.managerId);
    expect(profile).not.toHaveProperty('passwordHash');
    expect(profile).not.toHaveProperty('terminationDate');
  });

  it('rejects a wrong email with UnauthorizedError', async () => {
    const service = serviceWith(
      jest.fn(async () => {
        throw new NotFoundError('Employee not found');
      }),
    );

    await expect(service.login('nobody@example.com', CORRECT_PASSWORD)).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
  });

  it('rejects a wrong password with UnauthorizedError', async () => {
    const service = serviceWith(jest.fn(async () => employee));

    await expect(service.login(employee.email, 'wrong-password')).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
  });

  it('makes wrong-email and wrong-password failures indistinguishable', async () => {
    const wrongEmail = serviceWith(
      jest.fn(async () => {
        throw new NotFoundError('Employee not found');
      }),
    );
    const wrongPassword = serviceWith(jest.fn(async () => employee));

    let emailError: unknown;
    let passwordError: unknown;
    try {
      await wrongEmail.login('nobody@example.com', CORRECT_PASSWORD);
    } catch (error) {
      emailError = error;
    }
    try {
      await wrongPassword.login(employee.email, 'wrong-password');
    } catch (error) {
      passwordError = error;
    }

    expect(emailError).toBeInstanceOf(UnauthorizedError);
    expect(passwordError).toBeInstanceOf(UnauthorizedError);
    expect((emailError as UnauthorizedError).message).toBe('Invalid email or password');
    expect((passwordError as UnauthorizedError).message).toBe(
      (emailError as UnauthorizedError).message,
    );
  });
});
