import { EmployeeRepository, IEmployeeRepository, Employee } from '../../../../src/modules/employee';
import { EmploymentStatus } from '../../../../src/shared/types';

// Mock the shared db pool
jest.mock('../../../../src/shared/db/connection', () => ({
  pool: {},
}));

// Build a chainable query builder mock that is thenable
interface QueryBuilderMock {
  select: jest.Mock;
  where: jest.Mock;
  whereNull: jest.Mock;
  first: jest.Mock;
  insert: jest.Mock;
  update: jest.Mock;
  returning: jest.Mock;
  then: (resolve: (value: unknown) => void, reject?: (reason: unknown) => void) => Promise<void>;
}

function createQueryBuilderMock(resolvedValue: unknown): QueryBuilderMock {
  const thenable: Partial<QueryBuilderMock> = {};

  const methods = ['select', 'where', 'whereNull', 'first', 'insert', 'update', 'returning'] as const;

  for (const key of methods) {
    const mockFn = jest.fn<unknown, unknown[]>().mockReturnValue(thenable);
    (thenable as Record<string, unknown>)[key] = mockFn;
  }

  thenable.then = function (resolve: (value: unknown) => void) {
    resolve(resolvedValue);
    return Promise.resolve(undefined);
  };

  return thenable as QueryBuilderMock;
}

// Mock knex
const mockKnexFn = jest.fn();
jest.mock('knex', () => {
  return jest.fn(() => mockKnexFn);
});

function makeEmployeeRow(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    id: 'emp-1',
    employee_number: 'EMP001',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john@example.com',
    manager_id: 'mgr-1',
    department: 'Engineering',
    hire_date: new Date('2020-01-15'),
    termination_date: null,
    employment_status: 'ACTIVE',
    created_at: new Date('2020-01-15T08:00:00Z'),
    updated_at: new Date('2020-01-15T08:00:00Z'),
    deleted_at: null,
    ...overrides,
  };
}

function expectEmployee(result: Employee | null, expected: Record<string, unknown>): void {
  expect(result).not.toBeNull();
  if (result === null) return;
  expect(result.id).toBe(expected.id);
  expect(result.employeeNumber).toBe(expected.employee_number);
  expect(result.firstName).toBe(expected.first_name);
  expect(result.lastName).toBe(expected.last_name);
  expect(result.email).toBe(expected.email);
  expect(result.managerId).toBe(expected.manager_id);
  expect(result.department).toBe(expected.department);
  expect(result.hireDate).toEqual(expected.hire_date);
  expect(result.terminationDate).toBe(expected.termination_date ?? null);
  expect(result.employmentStatus).toBe(expected.employment_status);
  expect(result.createdAt).toEqual(expected.created_at);
  expect(result.updatedAt).toEqual(expected.updated_at);
  expect(result.deletedAt).toBe(expected.deleted_at ?? null);
}

describe('EmployeeRepository', () => {
  let repo: IEmployeeRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new EmployeeRepository();
  });

  describe('findById', () => {
    it('should return an employee when found', async () => {
      const row = makeEmployeeRow();
      const qb = createQueryBuilderMock(row);
      mockKnexFn.mockReturnValue(qb);

      const result = await repo.findById('emp-1');

      expect(mockKnexFn).toHaveBeenCalledWith('employees');
      expect(qb.select).toHaveBeenCalledWith('*');
      expect(qb.where).toHaveBeenCalledWith('id', 'emp-1');
      expect(qb.whereNull).toHaveBeenCalledWith('deleted_at');
      expect(qb.first).toHaveBeenCalled();
      expectEmployee(result, row);
    });

    it('should return null when not found', async () => {
      const qb = createQueryBuilderMock(undefined);
      mockKnexFn.mockReturnValue(qb);

      const result = await repo.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByEmployeeNumber', () => {
    it('should return an employee when found', async () => {
      const row = makeEmployeeRow();
      const qb = createQueryBuilderMock(row);
      mockKnexFn.mockReturnValue(qb);

      const result = await repo.findByEmployeeNumber('EMP001');

      expect(mockKnexFn).toHaveBeenCalledWith('employees');
      expect(qb.select).toHaveBeenCalledWith('*');
      expect(qb.where).toHaveBeenCalledWith('employee_number', 'EMP001');
      expect(qb.whereNull).toHaveBeenCalledWith('deleted_at');
      expect(qb.first).toHaveBeenCalled();
      expectEmployee(result, row);
    });

    it('should return null when not found', async () => {
      const qb = createQueryBuilderMock(undefined);
      mockKnexFn.mockReturnValue(qb);

      const result = await repo.findByEmployeeNumber('NONEXISTENT');

      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return all non-deleted employees', async () => {
      const row1 = makeEmployeeRow();
      const row2 = makeEmployeeRow({ id: 'emp-2', employee_number: 'EMP002' });
      const qb = createQueryBuilderMock([row1, row2]);
      mockKnexFn.mockReturnValue(qb);

      const results = await repo.findAll();

      expect(mockKnexFn).toHaveBeenCalledWith('employees');
      expect(qb.select).toHaveBeenCalledWith('*');
      expect(qb.whereNull).toHaveBeenCalledWith('deleted_at');
      expect(results).toHaveLength(2);
      expectEmployee(results[0], row1);
      expectEmployee(results[1], row2);
    });

    it('should return empty array when no employees', async () => {
      const qb = createQueryBuilderMock([]);
      mockKnexFn.mockReturnValue(qb);

      const results = await repo.findAll();

      expect(results).toEqual([]);
    });
  });

  describe('create', () => {
    it('should insert and return a new employee', async () => {
      const input: Omit<Employee, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'> = {
        employeeNumber: 'EMP001',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        managerId: 'mgr-1',
        department: 'Engineering',
        hireDate: new Date('2020-01-15'),
        terminationDate: null,
        employmentStatus: EmploymentStatus.ACTIVE,
      };

      const row = makeEmployeeRow();
      const qb = createQueryBuilderMock([row]);
      mockKnexFn.mockReturnValue(qb);

      const result = await repo.create(input);

      expect(mockKnexFn).toHaveBeenCalledWith('employees');
      expect(qb.insert).toHaveBeenCalledWith({
        employee_number: 'EMP001',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        manager_id: 'mgr-1',
        department: 'Engineering',
        hire_date: expect.any(Date),
        termination_date: null,
        employment_status: 'ACTIVE',
        created_at: expect.any(Date),
        updated_at: expect.any(Date),
      });
      expect(qb.returning).toHaveBeenCalledWith('*');
      expectEmployee(result, row);
    });
  });

  describe('update', () => {
    it('should update and return the employee', async () => {
      const existingRow = makeEmployeeRow();
      // First call: findById
      const qb1 = createQueryBuilderMock(existingRow);
      mockKnexFn.mockReturnValueOnce(qb1);

      // Second call: the db('employees') for update
      const updatedRow = makeEmployeeRow({ first_name: 'Jane', updated_at: new Date() });
      const qb2 = createQueryBuilderMock([updatedRow]);
      mockKnexFn.mockReturnValueOnce(qb2);

      const result = await repo.update('emp-1', { firstName: 'Jane' });

      expect(mockKnexFn).toHaveBeenCalledTimes(2);
      expect(qb2.where).toHaveBeenCalledWith('id', 'emp-1');
      expect(qb2.whereNull).toHaveBeenCalledWith('deleted_at');
      expect(qb2.update).toHaveBeenCalledWith(
        expect.objectContaining({ first_name: 'Jane', updated_at: expect.any(Date) }),
      );
      expect(qb2.returning).toHaveBeenCalledWith('*');
      expectEmployee(result, updatedRow);
    });

    it('should return null when employee does not exist', async () => {
      const qb = createQueryBuilderMock(undefined);
      mockKnexFn.mockReturnValue(qb);

      const result = await repo.update('nonexistent', { firstName: 'Jane' });

      expect(result).toBeNull();
      expect(mockKnexFn).toHaveBeenCalledTimes(1);
    });

    it('should return existing employee when no fields to update', async () => {
      const existingRow = makeEmployeeRow();
      const qb = createQueryBuilderMock(existingRow);
      mockKnexFn.mockReturnValue(qb);

      const result = await repo.update('emp-1', {});

      expect(mockKnexFn).toHaveBeenCalledTimes(1);
      expectEmployee(result, existingRow);
    });
  });

  describe('softDelete', () => {
    it('should set deleted_at and updated_at', async () => {
      const qb = createQueryBuilderMock(undefined);
      mockKnexFn.mockReturnValue(qb);

      await repo.softDelete('emp-1');

      expect(mockKnexFn).toHaveBeenCalledWith('employees');
      expect(qb.where).toHaveBeenCalledWith('id', 'emp-1');
      expect(qb.whereNull).toHaveBeenCalledWith('deleted_at');
      expect(qb.update).toHaveBeenCalledWith({
        deleted_at: expect.any(Date),
        updated_at: expect.any(Date),
      });
    });
  });
});
