import { PgEmployeeRepository } from '../../../../src/modules/employee/employee.repository';
import type { Employee } from '../../../../src/modules/employee/employee.model';

jest.mock('../../../../src/shared/db/connection', () => ({
  pool: {
    query: jest.fn(),
  },
}));

import { pool } from '../../../../src/shared/db/connection';

const mockQuery = pool.query as jest.Mock;

function makeEmployeeRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: overrides.id ?? 'emp-001',
    employee_number: overrides.employee_number ?? 'EN-001',
    first_name: overrides.first_name ?? 'John',
    last_name: overrides.last_name ?? 'Doe',
    email: overrides.email ?? 'john.doe@example.com',
    manager_id: overrides.manager_id ?? 'mgr-001',
    department: overrides.department ?? 'Engineering',
    hire_date: overrides.hire_date ?? new Date('2020-01-15'),
    termination_date: overrides.termination_date ?? null,
    employment_status: overrides.employment_status ?? 'ACTIVE',
    created_at: overrides.created_at ?? new Date('2024-01-01T00:00:00Z'),
    updated_at: overrides.updated_at ?? new Date('2024-06-01T00:00:00Z'),
  };
}

function makeEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
    id: 'emp-001',
    employeeNumber: 'EN-001',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    managerId: 'mgr-001',
    department: 'Engineering',
    hireDate: new Date('2020-01-15'),
    terminationDate: null,
    employmentStatus: 'ACTIVE',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-06-01T00:00:00Z'),
    ...overrides,
  };
}

describe('PgEmployeeRepository', () => {
  let repo: PgEmployeeRepository;

  beforeEach(() => {
    repo = new PgEmployeeRepository();
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should return an Employee when a row matches', async () => {
      const row = makeEmployeeRow();
      mockQuery.mockResolvedValueOnce({ rows: [row], rowCount: 1 } as never);

      const result = await repo.findById('emp-001');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('emp-001');
      expect(result!.employeeNumber).toBe('EN-001');
      expect(result!.firstName).toBe('John');
      expect(result!.lastName).toBe('Doe');
      expect(result!.email).toBe('john.doe@example.com');
      expect(result!.managerId).toBe('mgr-001');
      expect(result!.department).toBe('Engineering');
      expect(result!.hireDate).toEqual(new Date('2020-01-15'));
      expect(result!.terminationDate).toBeNull();
      expect(result!.employmentStatus).toBe('ACTIVE');
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM employees WHERE id = $1',
        ['emp-001'],
      );
    });

    it('should return null when no row matches', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

      const result = await repo.findById('nonexistent');

      expect(result).toBeNull();
    });

    it('should reject on a pool error', async () => {
      const error = new Error('Connection refused');
      mockQuery.mockRejectedValueOnce(error);

      await expect(repo.findById('emp-001')).rejects.toThrow('Connection refused');
    });
  });

  describe('findByEmployeeNumber', () => {
    it('should return an Employee when a row matches', async () => {
      const row = makeEmployeeRow({ employee_number: 'EN-999' });
      mockQuery.mockResolvedValueOnce({ rows: [row], rowCount: 1 } as never);

      const result = await repo.findByEmployeeNumber('EN-999');

      expect(result).not.toBeNull();
      expect(result!.employeeNumber).toBe('EN-999');
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM employees WHERE employee_number = $1',
        ['EN-999'],
      );
    });

    it('should return null when no row matches', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

      const result = await repo.findByEmployeeNumber('EN-000');

      expect(result).toBeNull();
    });

    it('should reject on a pool error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Query timeout'));

      await expect(repo.findByEmployeeNumber('EN-001')).rejects.toThrow('Query timeout');
    });
  });

  describe('findByEmail', () => {
    it('should return an Employee when a row matches', async () => {
      const row = makeEmployeeRow({ email: 'jane@example.com' });
      mockQuery.mockResolvedValueOnce({ rows: [row], rowCount: 1 } as never);

      const result = await repo.findByEmail('jane@example.com');

      expect(result).not.toBeNull();
      expect(result!.email).toBe('jane@example.com');
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM employees WHERE email = $1',
        ['jane@example.com'],
      );
    });

    it('should return null when no row matches', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

      const result = await repo.findByEmail('unknown@example.com');

      expect(result).toBeNull();
    });

    it('should reject on a pool error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Query timeout'));

      await expect(repo.findByEmail('john@example.com')).rejects.toThrow('Query timeout');
    });
  });

  describe('findByManagerId', () => {
    it('should return an array of Employees for a manager with direct reports', async () => {
      const row1 = makeEmployeeRow({ id: 'emp-001', employee_number: 'EN-001' });
      const row2 = makeEmployeeRow({ id: 'emp-002', employee_number: 'EN-002' });
      mockQuery.mockResolvedValueOnce({ rows: [row1, row2], rowCount: 2 } as never);

      const result = await repo.findByManagerId('mgr-001');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('emp-001');
      expect(result[1].id).toBe('emp-002');
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM employees WHERE manager_id = $1',
        ['mgr-001'],
      );
    });

    it('should return an empty array when no direct reports exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

      const result = await repo.findByManagerId('mgr-none');

      expect(result).toEqual([]);
    });

    it('should reject on a pool error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Query timeout'));

      await expect(repo.findByManagerId('mgr-001')).rejects.toThrow('Query timeout');
    });
  });

  describe('findAll', () => {
    it('should return all employees', async () => {
      const row1 = makeEmployeeRow({ id: 'emp-001' });
      const row2 = makeEmployeeRow({ id: 'emp-002' });
      mockQuery.mockResolvedValueOnce({ rows: [row1, row2], rowCount: 2 } as never);

      const result = await repo.findAll();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('emp-001');
      expect(result[1].id).toBe('emp-002');
      expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM employees');
    });

    it('should return an empty array when the table has no rows', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

      const result = await repo.findAll();

      expect(result).toEqual([]);
    });

    it('should reject on a pool error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Query timeout'));

      await expect(repo.findAll()).rejects.toThrow('Query timeout');
    });
  });

  describe('create', () => {
    const input: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'> = {
      employeeNumber: 'EN-NEW',
      firstName: 'Alice',
      lastName: 'Smith',
      email: 'alice.smith@example.com',
      managerId: 'mgr-001',
      department: 'Product',
      hireDate: new Date('2023-06-01'),
      terminationDate: null,
      employmentStatus: 'ACTIVE',
    };

    it('should insert and return a fully-populated Employee', async () => {
      const returnedRow = makeEmployeeRow({
        id: 'generated-id',
        employee_number: 'EN-NEW',
        first_name: 'Alice',
        last_name: 'Smith',
        email: 'alice.smith@example.com',
        manager_id: 'mgr-001',
        department: 'Product',
        hire_date: new Date('2023-06-01'),
        termination_date: null,
        employment_status: 'ACTIVE',
        created_at: new Date('2024-01-01T00:00:00Z'),
        updated_at: new Date('2024-01-01T00:00:00Z'),
      });
      mockQuery.mockResolvedValueOnce({ rows: [returnedRow], rowCount: 1 } as never);

      const result = await repo.create(input);

      expect(result.id).toBe('generated-id');
      expect(result.employeeNumber).toBe('EN-NEW');
      expect(result.firstName).toBe('Alice');
      expect(result.lastName).toBe('Smith');
      expect(result.email).toBe('alice.smith@example.com');
      expect(result.managerId).toBe('mgr-001');
      expect(result.department).toBe('Product');
      expect(result.hireDate).toEqual(new Date('2023-06-01'));
      expect(result.terminationDate).toBeNull();
      expect(result.employmentStatus).toBe('ACTIVE');
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();

      const queryCall = mockQuery.mock.calls[0];
      expect(queryCall[0]).toContain('INSERT INTO employees');
      expect(queryCall[1][1]).toBe('EN-NEW');
      expect(queryCall[1][2]).toBe('Alice');
      expect(queryCall[1][3]).toBe('Smith');
      expect(queryCall[1][4]).toBe('alice.smith@example.com');
      expect(queryCall[1][5]).toBe('mgr-001');
      expect(queryCall[1][6]).toBe('Product');
    });

    it('should reject on a unique-constraint violation (duplicate employeeNumber)', async () => {
      const error = new Error('duplicate key value violates unique constraint "employees_employee_number_key"');
      mockQuery.mockRejectedValueOnce(error);

      await expect(repo.create(input)).rejects.toThrow('duplicate key value');
    });

    it('should reject on a query error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Connection refused'));

      await expect(repo.create(input)).rejects.toThrow('Connection refused');
    });
  });

  describe('update', () => {
    it('should apply a partial update and return the updated Employee', async () => {
      const existingRow = makeEmployeeRow({ id: 'emp-001' });
      mockQuery.mockResolvedValueOnce({ rows: [existingRow], rowCount: 1 } as never);

      const updatedRow = makeEmployeeRow({
        id: 'emp-001',
        first_name: 'Jane',
        department: 'Design',
        updated_at: new Date('2024-07-01T00:00:00Z'),
      });
      mockQuery.mockResolvedValueOnce({ rows: [updatedRow], rowCount: 1 } as never);

      const result = await repo.update('emp-001', {
        firstName: 'Jane',
        department: 'Design',
      });

      expect(result).not.toBeNull();
      expect(result!.firstName).toBe('Jane');
      expect(result!.department).toBe('Design');
      expect(result!.lastName).toBe('Doe');
    });

    it('should return null when no row matches the id', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

      const result = await repo.update('nonexistent', { firstName: 'X' });

      expect(result).toBeNull();
    });

    it('should reject on a query error during findById', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Connection refused'));

      await expect(repo.update('emp-001', { firstName: 'X' })).rejects.toThrow('Connection refused');
    });

    it('should reject on a query error during the update query', async () => {
      const existingRow = makeEmployeeRow({ id: 'emp-001' });
      mockQuery.mockResolvedValueOnce({ rows: [existingRow], rowCount: 1 } as never);
      mockQuery.mockRejectedValueOnce(new Error('Update failed'));

      await expect(repo.update('emp-001', { firstName: 'X' })).rejects.toThrow('Update failed');
    });
  });
});
