import Fastify, { FastifyInstance } from 'fastify';
import { CreateEmployeeInput, Employee, employeeRoutes, IEmployeeService } from '../../../../src/modules/employee';
import { AuthUser } from '../../../../src/shared/auth';
import { NotFoundError } from '../../../../src/shared/errors';
import { EmployeeProfile, EmployeeRole, EmploymentStatus } from '../../../../src/shared/types';

/**
 * Route-level tests for the GET /employees/me HTTP boundary.
 *
 * The route is the seam where the authenticated actor is resolved from `request.user`
 * and passed to `getEmployeeProfileById`. These tests exercise that boundary — the
 * existing employee.service.test.ts already covers the profile mapping (never leaking
 * passwordHash/terminationDate), so here the service is stubbed at the same
 * `employeeService` decoration seam the leave route tests use.
 */
describe('employee routes — GET /employees/me', () => {
  let app: FastifyInstance;

  const profile: EmployeeProfile = {
    id: 'emp-1',
    employeeNumber: 'EMP-001',
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.com',
    role: EmployeeRole.EMPLOYEE,
    managerId: null,
    department: 'Engineering',
    hireDate: new Date('2020-01-01T00:00:00.000Z'),
    employmentStatus: EmploymentStatus.ACTIVE,
  };

  function buildApp(
    actor: AuthUser | undefined,
    getEmployeeProfileById: (id: string) => Promise<EmployeeProfile>,
  ): FastifyInstance {
    // Implement the full IEmployeeService seam so this is a faithful fake rather than a
    // partial object behind an `as IEmployeeService` assertion. The route only calls
    // getEmployeeProfileById; the remaining methods are unreachable throwing stubs.
    const service: IEmployeeService = {
      createEmployee: async (_input: CreateEmployeeInput): Promise<Employee> => {
        throw new Error('createEmployee is not exercised by GET /employees/me');
      },
      getEmployeeById: async (_id: string): Promise<Employee> => {
        throw new Error('getEmployeeById is not exercised by GET /employees/me');
      },
      getEmployeeByEmail: async (_email: string): Promise<Employee> => {
        throw new Error('getEmployeeByEmail is not exercised by GET /employees/me');
      },
      getEmployeesByManagerId: async (_managerId: string): Promise<Employee[]> => {
        throw new Error('getEmployeesByManagerId is not exercised by GET /employees/me');
      },
      getEmployeeProfileById,
    };

    const instance = Fastify();
    (instance as unknown as { employeeService: IEmployeeService }).employeeService = service;
    instance.decorateRequest('user', undefined);
    instance.addHook('preHandler', async (request) => {
      (request as unknown as { user: unknown }).user = actor;
    });
    return instance;
  }

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it('returns the authenticated employee profile and never a passwordHash', async () => {
    const actor: AuthUser = { id: 'emp-1', role: EmployeeRole.EMPLOYEE };
    let receivedId: string | undefined;

    app = buildApp(
      actor,
      jest.fn(async (id: string) => {
        receivedId = id;
        return profile;
      }),
    );
    await app.register(employeeRoutes);
    await app.ready();

    const response = await app.inject({ method: 'GET', url: '/employees/me' });

    expect(response.statusCode).toBe(200);
    expect(receivedId).toBe(actor.id);
    const body = response.json();
    expect(body.employeeNumber).toBe(profile.employeeNumber);
    expect(body.email).toBe(profile.email);
    expect(body.role).toBe(profile.role);
    expect(body).not.toHaveProperty('passwordHash');
    expect(body).not.toHaveProperty('terminationDate');
  });

  it('returns 401 when there is no authenticated user', async () => {
    app = buildApp(undefined, jest.fn(async () => profile));
    await app.register(employeeRoutes);
    await app.ready();

    const response = await app.inject({ method: 'GET', url: '/employees/me' });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('returns 401 when the authenticated user has an invalid role', async () => {
    const actor = { id: 'emp-1', role: 'SUPERUSER' } as unknown as AuthUser;

    app = buildApp(actor, jest.fn(async () => profile));
    await app.register(employeeRoutes);
    await app.ready();

    const response = await app.inject({ method: 'GET', url: '/employees/me' });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('returns 404 / NOT_FOUND when the actor has no employee profile', async () => {
    const actor: AuthUser = { id: 'emp-none', role: EmployeeRole.EMPLOYEE };

    app = buildApp(actor, jest.fn(async () => {
      throw new NotFoundError('Employee profile not found');
    }));
    await app.register(employeeRoutes);
    await app.ready();

    const response = await app.inject({ method: 'GET', url: '/employees/me' });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ code: 'NOT_FOUND' });
  });
});
