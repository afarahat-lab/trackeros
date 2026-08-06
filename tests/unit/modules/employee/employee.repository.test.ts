import { PgEmployeeRepository } from '../../../../src/modules/employee/employee.repository';
import { Employee } from '../../../../src/modules/employee/employee.model';

jest.mock('../../../../src/shared/db/connection', () => ({
  pool: {
    query: jest.fn(),
  },
}));

import { pool } from '../../../../src/shared/db/connection';

function makeEmployeeRow(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  const now = new Date();
  return {
    id: 'emp-001',
    employee_number: 'E001',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john.doe@example.com',
    manager_id: 'mgr-001',
    department: 'Engineering',
    hire_date: new Date('2020-01-15'),
    termination_date: null,
    employment_status: 'ACTIVE',
    created_at: now,
    updated_at: now,
    deleted_at: null,
    ...overrides,
  };
}

function makeEmployee(overrides: Partial<Employee> = {}): Employee {
  const now = new Date();
  return {
    id: 'emp-001',
    employeeNumber: 'E001',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    managerId: 'mgr-001',
    department: 'Engineering',
    hireDate: new Date('2020-01-15'),
    terminationDate: null,
    employmentStatus: 'ACTIVE',
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    ...overrides,
  };
}

describe('PgEmployeeRepository', () => {
  let repo: PgEmployeeRepository;
  const mockQuery = pool.query as jest.Mock;

  beforeEach(() => {
    repo = new PgEmployeeRepository();
    mockQuery.mockReset();
  });

  describe('findById', () => {
    it('should return an employee when found', async () => {
      const row = makeEmployeeRow();
      mockQuery.mockResolvedValueOnce({ rows: [row], rowCount: 1 });

      const result = await repo.findById('emp-001');

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM employees WHERE id = $1 AND deleted_at IS NULL',
        ['emp-001']
      );
      expect(result).not.toBeNull();
      expect(result!.id).toBe('emp-001');
      expect(result!.employeeNumber).toBe('E001');
      expect(result!.firstName).toBe('John');
      expect(result!.lastName).toBe('Doe');
      expect(result!.email).toBe('john.doe@example.com');
      expect(result!.managerId).toBe('mgr-001');
      expect(result!.department).toBe('Engineering');
      expect(result!.employmentStatus).toBe('ACTIVE');
    });

    it('should return null when employee is not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await repo.findById('nonexistent');

      expect(result).toBeNull();
    });

    it('should return null when row fails type guard', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 123, employee_number: 'E001' }], rowCount: 1 });

      const result = await repo.findById('emp-001');

      expect(result).toBeNull();
    });

    it('should propagate database errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('connection refused'));

      await expect(repo.findById('emp-001')).rejects.toThrow('connection refused');
    });
  });

  describe('findByEmployeeNumber', () => {
    it('should return an employee when found by employee number', async () => {
      const row = makeEmployeeRow();
      mockQuery.mockResolvedValueOnce({ rows: [row], rowCount: 1 });

      const result = await repo.findByEmployeeNumber('E001');

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM employees WHERE employee_number = $1 AND deleted_at IS NULL',
        ['E001']
      );
      expect(result).not.toBeNull();
      expect(result!.employeeNumber).toBe('E001');
    });

    it('should return null when employee number is not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await repo.findByEmployeeNumber('E999');

      expect(result).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should return an employee when found by email', async () => {
      const row = makeEmployeeRow();
      mockQuery.mockResolvedValueOnce({ rows: [row], rowCount: 1 });

      const result = await repo.findByEmail('john.doe@example.com');

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM employees WHERE email = $1 AND deleted_at IS NULL',
        ['john.doe@example.com']
      );
      expect(result).not.toBeNull();
      expect(result!.email).toBe('john.doe@example.com');
    });

    it('should return null when email is not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await repo.findByEmail('unknown@example.com');

      expect(result).toBeNull();
    });
  });

  describe('findByManagerId', () => {
    it('should return employees for a given manager', async () => {
      const row1 = makeEmployeeRow({ id: 'emp-001' });
      const row2 = makeEmployeeRow({ id: 'emp-002', employee_number: 'E002', email: 'jane@example.com' });
      mockQuery.mockResolvedValueOnce({ rows: [row1, row2], rowCount: 2 });

      const result = await repo.findByManagerId('mgr-001');

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM employees WHERE manager_id = $1 AND deleted_at IS NULL',
        ['mgr-001']
      );
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('emp-001');
      expect(result[1].id).toBe('emp-002');
    });

    it('should return an empty array when no employees found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await repo.findByManagerId('mgr-999');

      expect(result).toEqual([]);
    });

    it('should filter out rows that fail the type guard', async () => {
      const validRow = makeEmployeeRow({ id: 'emp-001' });
      const invalidRow = { id: 123 };
      mockQuery.mockResolvedValueOnce({ rows: [validRow, invalidRow], rowCount: 2 });

      const result = await repo.findByManagerId('mgr-001');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('emp-001');
    });
  });

  describe('findAll', () => {
    it('should return all non-deleted employees', async () => {
      const row1 = makeEmployeeRow({ id: 'emp-001' });
      const row2 = makeEmployeeRow({ id: 'emp-002', employee_number: 'E002', email: 'jane@example.com' });
      mockQuery.mockResolvedValueOnce({ rows: [row1, row2], rowCount: 2 });

      const result = await repo.findAll();

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM employees WHERE deleted_at IS NULL',
        undefined
      );
      expect(result).toHaveLength(2);
    });

    it('should return an empty array when no employees exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await repo.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    it('should create an employee and return it', async () => {
      const input = {
        employeeNumber: 'E003',
        firstName: 'Alice',
        lastName: 'Smith',
        email: 'alice@example.com',
        managerId: 'mgr-001',
        department: 'Marketing',
        hireDate: new Date('2021-06-01'),
        terminationDate: null,
        employmentStatus: 'ACTIVE' as const,
      };

      mockQuery.mockResolvedValueOnce({
        rows: [makeEmployeeRow({
          id: 'generated-id',
          employee_number: 'E003',
          first_name: 'Alice',
          last_name: 'Smith',
          email: 'alice@example.com',
          department: 'Marketing',
          hire_date: new Date('2021-06-01'),
        })],
        rowCount: 1,
      });

      const result = await repo.create(input);

      expect(mockQuery).toHaveBeenCalledTimes(1);
      const queryText = mockQuery.mock.calls[0][0];
      expect(queryText).toContain('INSERT INTO employees');
      expect(queryText).toContain('RETURNING *');
      expect(result.employeeNumber).toBe('E003');
      expect(result.firstName).toBe('Alice');
      expect(result.lastName).toBe('Smith');
      expect(result.email).toBe('alice@example.com');
      expect(result.employmentStatus).toBe('ACTIVE');
    });

    it('should throw when insert returns no row', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(
        repo.create({
          employeeNumber: 'E004',
          firstName: 'Bob',
          lastName: 'Brown',
          email: 'bob@example.com',
          managerId: null,
          department: null,
          hireDate: new Date(),
          terminationDate: null,
          employmentStatus: 'ACTIVE',
        })
      ).rejects.toThrow('Failed to create employee');
    });

    it('should throw when insert returns invalid row', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 123 }], rowCount: 1 });

      await expect(
        repo.create({
          employeeNumber: 'E004',
          firstName: 'Bob',
          lastName: 'Brown',
          email: 'bob@example.com',
          managerId: null,
          department: null,
          hireDate: new Date(),
          terminationDate: null,
          employmentStatus: 'ACTIVE',
        })
      ).rejects.toThrow('Failed to create employee');
    });
  });

  describe('update', () => {
    it('should update an employee and return the updated record', async () => {
      const updatedRow = makeEmployeeRow({
        first_name: 'Johnny',
        department: 'Design',
      });
      mockQuery.mockResolvedValueOnce({ rows: [updatedRow], rowCount: 1 });

      const result = await repo.update('emp-001', {
        firstName: 'Johnny',
        department: 'Design',
      });

      expect(mockQuery).toHaveBeenCalledTimes(1);
      const queryText = mockQuery.mock.calls[0][0];
      expect(queryText).toContain('UPDATE employees SET');
      expect(queryText).toContain('first_name = $1');
      expect(queryText).toContain('department = $2');
      expect(queryText).toContain('updated_at = $3');
      expect(queryText).toContain('WHERE id = $4');
      expect(result).not.toBeNull();
      expect(result!.firstName).toBe('Johnny');
      expect(result!.department).toBe('Design');
    });

    it('should return null when employee is not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await repo.update('nonexistent', { firstName: 'X' });

      expect(result).toBeNull();
    });

    it('should return current employee when no fields are provided', async () => {
      const row = makeEmployeeRow();
      mockQuery.mockResolvedValueOnce({ rows: [row], rowCount: 1 });

      const result = await repo.update('emp-001', {});

      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockQuery.mock.calls[0][0]).toContain('SELECT * FROM employees WHERE id = $1');
      expect(result).not.toBeNull();
    });

    it('should handle null managerId and department', async () => {
      const updatedRow = makeEmployeeRow({ manager_id: null, department: null });
      mockQuery.mockResolvedValueOnce({ rows: [updatedRow], rowCount: 1 });

      const result = await repo.update('emp-001', {
        managerId: null,
        department: null,
      });

      expect(result).not.toBeNull();
      expect(result!.managerId).toBeNull();
      expect(result!.department).toBeNull();
    });

    it('should propagate database errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('update failed'));

      await expect(
        repo.update('emp-001', { firstName: 'X' })
      ).rejects.toThrow('update failed');
    });
  });

  describe('softDelete', () => {
    it('should soft-delete an employee and return true', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      const result = await repo.softDelete('emp-001');

      expect(mockQuery).toHaveBeenCalledWith(
        'UPDATE employees SET deleted_at = $1, updated_at = $2 WHERE id = $3 AND deleted_at IS NULL',
        [expect.any(Date), expect.any(Date), 'emp-001']
      );
      expect(result).toBe(true);
    });

    it('should return false when employee is not found or already deleted', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await repo.softDelete('nonexistent');

      expect(result).toBe(false);
    });

    it('should propagate database errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('delete failed'));

      await expect(repo.softDelete('emp-001')).rejects.toThrow('delete failed');
    });
  });
});
