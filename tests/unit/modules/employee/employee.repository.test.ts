import { EmployeeRepository } from '../../../../src/modules/employee/employee.repository';
import { Employee } from '../../../../src/modules/employee/employee.model';
import { Pool } from 'pg';

jest.mock('../../../../src/shared/db/connection', () => {
  const mockPool = {
    query: jest.fn(),
  };
  return { pool: mockPool as unknown as Pool };
});

import { pool } from '../../../../src/shared/db/connection';

function makeEmployeeRow(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    id: 'emp-1',
    employee_number: 'E001',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john@example.com',
    manager_id: 'mgr-1',
    department: 'Engineering',
    hire_date: '2023-01-15T00:00:00.000Z',
    termination_date: null,
    employment_status: 'ACTIVE',
    created_at: '2023-01-15T00:00:00.000Z',
    updated_at: '2023-06-01T00:00:00.000Z',
    deleted_at: null,
    ...overrides,
  };
}

function expectedEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
    id: 'emp-1',
    employeeNumber: 'E001',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    managerId: 'mgr-1',
    department: 'Engineering',
    hireDate: new Date('2023-01-15T00:00:00.000Z'),
    terminationDate: null,
    employmentStatus: 'ACTIVE',
    createdAt: new Date('2023-01-15T00:00:00.000Z'),
    updatedAt: new Date('2023-06-01T00:00:00.000Z'),
    deletedAt: null,
    ...overrides,
  };
}

describe('EmployeeRepository', () => {
  let repo: EmployeeRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new EmployeeRepository();
  });

  describe('findById', () => {
    it('should return an employee when found', async () => {
      const row = makeEmployeeRow();
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [row] });

      const result = await repo.findById('emp-1');

      expect(result).toEqual(expectedEmployee());
      expect(pool.query).toHaveBeenCalledWith(
        'SELECT * FROM employees WHERE id = $1 AND deleted_at IS NULL',
        ['emp-1'],
      );
    });

    it('should return null when not found', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const result = await repo.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByEmployeeNumber', () => {
    it('should return an employee when found', async () => {
      const row = makeEmployeeRow();
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [row] });

      const result = await repo.findByEmployeeNumber('E001');

      expect(result).toEqual(expectedEmployee());
      expect(pool.query).toHaveBeenCalledWith(
        'SELECT * FROM employees WHERE employee_number = $1 AND deleted_at IS NULL',
        ['E001'],
      );
    });

    it('should return null when not found', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const result = await repo.findByEmployeeNumber('E999');

      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return all non-deleted employees ordered by employee_number', async () => {
      const row1 = makeEmployeeRow();
      const row2 = makeEmployeeRow({ id: 'emp-2', employee_number: 'E002' });
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [row1, row2] });

      const result = await repo.findAll();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(expectedEmployee());
      expect(result[1]).toEqual(expectedEmployee({ id: 'emp-2', employeeNumber: 'E002' }));
      expect(pool.query).toHaveBeenCalledWith(
        'SELECT * FROM employees WHERE deleted_at IS NULL ORDER BY employee_number',
      );
    });

    it('should return empty array when no employees exist', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const result = await repo.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    it('should insert and return a new employee', async () => {
      const input: Omit<Employee, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'> = {
        employeeNumber: 'E001',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        managerId: 'mgr-1',
        department: 'Engineering',
        hireDate: new Date('2023-01-15T00:00:00.000Z'),
        terminationDate: null,
        employmentStatus: 'ACTIVE',
      };

      const row = makeEmployeeRow();
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [row] });

      const result = await repo.create(input);

      expect(result).toEqual(expectedEmployee());
      expect(pool.query).toHaveBeenCalledTimes(1);
      const sql: string = (pool.query as jest.Mock).mock.calls[0][0];
      const params: unknown[] = (pool.query as jest.Mock).mock.calls[0][1];
      expect(sql).toContain('INSERT INTO employees');
      expect(params[0]).toBe('E001');
      expect(params[1]).toBe('John');
      expect(params[2]).toBe('Doe');
      expect(params[3]).toBe('john@example.com');
      expect(params[4]).toBe('mgr-1');
      expect(params[5]).toBe('Engineering');
      expect(params[8]).toBe('ACTIVE');
    });
  });

  describe('update', () => {
    it('should update and return the employee', async () => {
      const existingRow = makeEmployeeRow();
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [existingRow] });

      const updatedRow = makeEmployeeRow({ first_name: 'Jane', updated_at: '2023-07-01T00:00:00.000Z' });
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [updatedRow] });

      const result = await repo.update('emp-1', { firstName: 'Jane' });

      expect(result).not.toBeNull();
      expect(result!.firstName).toBe('Jane');
      expect(pool.query).toHaveBeenCalledTimes(2);
    });

    it('should return null when employee does not exist', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const result = await repo.update('nonexistent', { firstName: 'Jane' });

      expect(result).toBeNull();
    });

    it('should return existing employee when no fields to update', async () => {
      const existingRow = makeEmployeeRow();
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [existingRow] });

      const result = await repo.update('emp-1', {});

      expect(result).toEqual(expectedEmployee());
      expect(pool.query).toHaveBeenCalledTimes(1);
    });
  });

  describe('softDelete', () => {
    it('should set deleted_at on the employee', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await repo.softDelete('emp-1');

      expect(pool.query).toHaveBeenCalledWith(
        'UPDATE employees SET deleted_at = $1, updated_at = $2 WHERE id = $3 AND deleted_at IS NULL',
        [expect.any(Date), expect.any(Date), 'emp-1'],
      );
    });
  });
});
