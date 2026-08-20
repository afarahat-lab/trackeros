import { PgEmployeeRepository } from '../../../../src/modules/employee/employee.repository';
import { Employee } from '../../../../src/modules/employee/employee.model';
import { EmploymentStatus } from '../../../../src/shared/types';

jest.mock('../../../../src/shared/db/connection', () => ({
  pool: {
    query: jest.fn(),
  },
}));

import { pool } from '../../../../src/shared/db/connection';

const mockQuery = pool.query as jest.Mock;

function makeEmployeeRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: overrides.id ?? 'emp-1',
    employee_number: overrides.employee_number ?? 'EMP001',
    first_name: overrides.first_name ?? 'John',
    last_name: overrides.last_name ?? 'Doe',
    email: overrides.email ?? 'john@example.com',
    manager_id: (overrides.manager_id ?? null) as string | null,
    department: (overrides.department ?? 'Engineering') as string | null,
    hire_date: overrides.hire_date ?? new Date('2020-01-15'),
    termination_date: (overrides.termination_date ?? null) as Date | null,
    employment_status: overrides.employment_status ?? 'active',
    created_at: overrides.created_at ?? new Date('2020-01-15T10:00:00Z'),
    updated_at: overrides.updated_at ?? new Date('2020-01-15T10:00:00Z'),
    deleted_at: (overrides.deleted_at ?? null) as Date | null,
  };
}

function makeEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
    id: 'emp-1',
    employeeNumber: 'EMP001',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    managerId: null,
    department: 'Engineering',
    hireDate: new Date('2020-01-15'),
    terminationDate: null,
    employmentStatus: EmploymentStatus.active,
    createdAt: new Date('2020-01-15T10:00:00Z'),
    updatedAt: new Date('2020-01-15T10:00:00Z'),
    deletedAt: null,
    ...overrides,
  };
}

describe('PgEmployeeRepository', () => {
  let repo: PgEmployeeRepository;

  beforeEach(() => {
    repo = new PgEmployeeRepository();
    mockQuery.mockReset();
  });

  describe('findById', () => {
    it('should return Employee when row exists and is not soft-deleted', async () => {
      const row = makeEmployeeRow();
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.findById('emp-1');

      expect(result).toEqual(makeEmployee());
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM employees WHERE id = $1 AND deleted_at IS NULL',
        ['emp-1'],
      );
    });

    it('should return null when no matching non-deleted row found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findById('nonexistent');

      expect(result).toBeNull();
    });

    it('should filter out soft-deleted rows via deleted_at IS NULL', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await repo.findById('emp-1');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('deleted_at IS NULL'),
        ['emp-1'],
      );
    });
  });

  describe('findByEmployeeNumber', () => {
    it('should return Employee when employee number matches', async () => {
      const row = makeEmployeeRow({ employee_number: 'EMP002' });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.findByEmployeeNumber('EMP002');

      expect(result).toEqual(makeEmployee({ employeeNumber: 'EMP002' }));
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM employees WHERE employee_number = $1 AND deleted_at IS NULL',
        ['EMP002'],
      );
    });

    it('should return null when no match found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findByEmployeeNumber('NONEXISTENT');

      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return all non-deleted employees', async () => {
      const row1 = makeEmployeeRow({ id: 'emp-1', employee_number: 'EMP001' });
      const row2 = makeEmployeeRow({ id: 'emp-2', employee_number: 'EMP002' });
      mockQuery.mockResolvedValueOnce({ rows: [row1, row2] });

      const result = await repo.findAll();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(makeEmployee());
      expect(result[1]).toEqual(makeEmployee({ id: 'emp-2', employeeNumber: 'EMP002' }));
    });

    it('should return empty array when no non-deleted rows exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findAll();

      expect(result).toEqual([]);
    });

    it('should exclude soft-deleted rows via deleted_at IS NULL filter', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await repo.findAll();

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('deleted_at IS NULL'),
      );
    });
  });

  describe('create', () => {
    it('should insert a new employee and return the created Employee', async () => {
      const input = {
        employeeNumber: 'EMP003',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        managerId: 'emp-1',
        department: 'Marketing',
        hireDate: new Date('2021-06-01'),
        terminationDate: null,
        employmentStatus: EmploymentStatus.active,
      };
      const row = makeEmployeeRow({
        id: 'emp-3',
        employee_number: 'EMP003',
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'jane@example.com',
        manager_id: 'emp-1',
        department: 'Marketing',
        hire_date: new Date('2021-06-01'),
      });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.create(input);

      expect(result).toEqual(
        makeEmployee({
          id: 'emp-3',
          employeeNumber: 'EMP003',
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com',
          managerId: 'emp-1',
          department: 'Marketing',
          hireDate: new Date('2021-06-01'),
        }),
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO employees'),
        [
          'EMP003',
          'Jane',
          'Smith',
          'jane@example.com',
          'emp-1',
          'Marketing',
          new Date('2021-06-01'),
          null,
          'active',
        ],
      );
    });
  });

  describe('update', () => {
    it('should update employee fields and return the updated Employee', async () => {
      const row = makeEmployeeRow({
        first_name: 'Updated',
        department: 'Sales',
      });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.update('emp-1', {
        firstName: 'Updated',
        department: 'Sales',
      });

      expect(result).toEqual(
        makeEmployee({ firstName: 'Updated', department: 'Sales' }),
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE employees SET'),
        expect.arrayContaining(['emp-1', 'Updated', 'Sales']),
      );
    });

    it('should return null when employee does not exist or is soft-deleted', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.update('nonexistent', { firstName: 'X' });

      expect(result).toBeNull();
    });

    it('should return existing employee when no valid keys are provided', async () => {
      const row = makeEmployeeRow();
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.update('emp-1', {});

      expect(result).toEqual(makeEmployee());
    });
  });

  describe('softDelete', () => {
    it('should set deleted_at to a timestamp for the given id', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await repo.softDelete('emp-1');

      expect(mockQuery).toHaveBeenCalledWith(
        'UPDATE employees SET deleted_at = NOW() WHERE id = $1',
        ['emp-1'],
      );
    });

    it('should be idempotent — does not throw if id does not exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(repo.softDelete('nonexistent')).resolves.toBeUndefined();
    });

    it('should return void', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.softDelete('emp-1');

      expect(result).toBeUndefined();
    });
  });
});
