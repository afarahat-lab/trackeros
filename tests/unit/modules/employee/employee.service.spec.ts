import { PoolClient } from 'pg';
import {
  CreateEmployeeInput,
  Employee,
  EmployeeService,
  InvalidEmployeeTransitionError,
  PgEmployeeRepository,
} from '../../../../src/modules/employee';
import { IEmployeeRepository } from '../../../../src/modules/employee/employee.model';
import { IUnitOfWork } from '../../../../src/shared/db/unit-of-work';

function makeEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
    id: 'emp-1',
    employeeNumber: 'E001',
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane@example.com',
    managerId: null,
    department: null,
    hireDate: new Date('2024-01-01T00:00:00.000Z'),
    terminationDate: null,
    employmentStatus: 'ACTIVE',
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    deletedAt: null,
    ...overrides,
  };
}

function createInput(
  overrides: Partial<CreateEmployeeInput> = {},
): CreateEmployeeInput {
  const employee = makeEmployee();
  return {
    employeeNumber: employee.employeeNumber,
    firstName: employee.firstName,
    lastName: employee.lastName,
    email: employee.email,
    managerId: employee.managerId,
    department: employee.department,
    hireDate: employee.hireDate,
    terminationDate: employee.terminationDate,
    employmentStatus: employee.employmentStatus,
    ...overrides,
  };
}

describe('EmployeeService', () => {
  let employees: jest.Mocked<IEmployeeRepository>;
  let uow: jest.Mocked<IUnitOfWork>;
  let service: EmployeeService;
  const fakeClient = {} as PoolClient;

  beforeEach(() => {
    employees = {
      create: jest.fn(),
      list: jest.fn(),
      findById: jest.fn(),
      findByEmployeeNumber: jest.fn(),
      findByEmail: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    uow = {
      withTransaction: jest.fn(),
    };
    uow.withTransaction.mockImplementation(async (fn) => fn(fakeClient));

    service = new EmployeeService(
      employees as unknown as PgEmployeeRepository,
      uow,
    );
  });

  it('create assigns id/createdAt/updatedAt and deletedAt=null and delegates to repo.create', async () => {
    const input = createInput();
    employees.create.mockResolvedValue(makeEmployee());

    const result = await service.create(input);

    expect(employees.create).toHaveBeenCalledTimes(1);
    const calledWith = employees.create.mock.calls[0][0];
    expect(typeof calledWith.id).toBe('string');
    expect(calledWith.id.length).toBeGreaterThan(0);
    expect(calledWith.createdAt).toBeInstanceOf(Date);
    expect(calledWith.updatedAt).toBeInstanceOf(Date);
    expect(calledWith.deletedAt).toBeNull();
    expect(result).toBeDefined();
  });

  it('list delegates to repo.list', async () => {
    const employee = makeEmployee();
    employees.list.mockResolvedValue([employee]);

    const result = await service.list();

    expect(employees.list).toHaveBeenCalledWith(undefined);
    expect(result).toEqual([employee]);
  });

  it('findById delegates to repo.findById', async () => {
    const employee = makeEmployee();
    employees.findById.mockResolvedValue(employee);

    const result = await service.findById('emp-1');

    expect(employees.findById).toHaveBeenCalledWith('emp-1', undefined);
    expect(result).toEqual(employee);
  });

  it('update with a supplied client delegates directly', async () => {
    const changes = { firstName: 'Janet' };
    const updated = makeEmployee({ firstName: 'Janet' });
    employees.update.mockResolvedValue(updated);

    const result = await service.update('emp-1', changes, fakeClient);

    expect(employees.update).toHaveBeenCalledWith('emp-1', changes, fakeClient);
    expect(uow.withTransaction).not.toHaveBeenCalled();
    expect(result).toEqual(updated);
  });

  it('terminate throws InvalidEmployeeTransitionError when already TERMINATED', async () => {
    employees.findById.mockResolvedValue(
      makeEmployee({ employmentStatus: 'TERMINATED' }),
    );

    await expect(
      service.terminate('emp-1', new Date('2024-06-30T00:00:00.000Z')),
    ).rejects.toThrow(InvalidEmployeeTransitionError);
  });

  it('reactivate throws InvalidEmployeeTransitionError when already ACTIVE', async () => {
    employees.findById.mockResolvedValue(
      makeEmployee({ employmentStatus: 'ACTIVE' }),
    );

    await expect(service.reactivate('emp-1')).rejects.toThrow(
      InvalidEmployeeTransitionError,
    );
  });
});
