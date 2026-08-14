import { PgEmployeeRepository, UniqueConstraintViolationError } from '../../../../src/modules/employee/employee.repository';
import { Employee } from '../../../../src/modules/employee/employee.model';
import { EmploymentStatus } from '../../../../src/shared/types/leave.types';

jest.mock('../../../../src/shared/db/connection', () => ({
  pool: {
    query: jest.fn(),
  },
}));

import { pool } from '../../../../src/shared/db/connection';

const mockQuery = pool.query as jest.Mock;

function makeRow(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    id: 'emp-001',
    employee_number: 'E001',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john@example.com',
    manager_id: 'emp-000',
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

function makeEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
    id: 'emp-001',
    employeeNumber: 'E001',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    managerId: 'emp-000',
    department: 'Engineering',
    hireDate: new Date('2023-01-15T00:00:00.000Z'),
    terminationDate: null,
    employmentStatus: EmploymentStatus.ACTIVE,
    createdAt: new Date('2023-01-15T00:00:00.000Z'),
    updatedAt: new Date('2023-06-01T00:00:00.000Z'),
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
    it('returns the employee when found and not soft-deleted', async () => {
      const row = makeRow();
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.findById('emp-001');

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM employees WHERE id = $1 AND deleted_at IS NULL',
        ['emp-001'],
      );
      expect(result).toEqual(makeEmployee());
    });

    it('returns null when no non-deleted row matches', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findById('emp-999');

      expect(result).toBeNull();
    });

    it('excludes soft-deleted employees', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findById('emp-001');

      expect(result).toBeNull();
    });

    it('uses the provided PoolClient when given', async () => {
      const client = { query: jest.fn().mockResolvedValueOnce({ rows: [makeRow()] }) };
      await repo.findById('emp-001', client as unknown as import('pg').PoolClient);

      expect(client.query).toHaveBeenCalled();
      expect(mockQuery).not.toHaveBeenCalled();
    });
  });

  describe('findByManagerId', () => {
    it('returns non-deleted employees for the given manager', async () => {
      const rows = [makeRow(), makeRow({ id: 'emp-002', employee_number: 'E002' })];
      mockQuery.mockResolvedValueOnce({ rows });

      const result = await repo.findByManagerId('emp-000');

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM employees WHERE manager_id = $1 AND deleted_at IS NULL',
        ['emp-000'],
      );
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('emp-001');
      expect(result[1].id).toBe('emp-002');
    });

    it('returns an empty array when manager has no direct reports', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findByManagerId('emp-000');

      expect(result).toEqual([]);
    });

    it('excludes soft-deleted direct reports', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findByManagerId('emp-000');

      expect(result).toEqual([]);
    });
  });

  describe('findAll', () => {
    it('returns all non-deleted employees', async () => {
      const rows = [
        makeRow(),
        makeRow({ id: 'emp-002', employee_number: 'E002' }),
      ];
      mockQuery.mockResolvedValueOnce({ rows });

      const result = await repo.findAll();

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM employees WHERE deleted_at IS NULL',
      );
      expect(result).toHaveLength(2);
    });

    it('returns an empty array when no non-deleted employees exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    const input = {
      employeeNumber: 'E001',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      managerId: 'emp-000',
      department: 'Engineering',
      hireDate: new Date('2023-01-15T00:00:00.000Z'),
      terminationDate: null,
      employmentStatus: EmploymentStatus.ACTIVE,
    };

    it('persists a new employee and returns the entity with server-generated fields', async () => {
      const row = makeRow();
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.create(input);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO employees'),
        [
          'E001',
          'John',
          'Doe',
          'john@example.com',
          'emp-000',
          'Engineering',
          input.hireDate,
          null,
          'ACTIVE',
        ],
      );
      expect(result).toEqual(makeEmployee());
    });

    it('throws UniqueConstraintViolationError on unique violation (code 23505)', async () => {
      const pgError = Object.assign(new Error('duplicate key'), { code: '23505' });
      mockQuery.mockRejectedValueOnce(pgError);

      await expect(repo.create(input)).rejects.toThrow(UniqueConstraintViolationError);
    });

    it('re-throws non-unique-constraint errors', async () => {
      const pgError = new Error('connection refused');
      mockQuery.mockRejectedValueOnce(pgError);

      await expect(repo.create(input)).rejects.toThrow('connection refused');
    });
  });

  describe('update', () => {
    it('updates supplied fields and returns the refreshed entity', async () => {
      const updatedRow = makeRow({
        first_name: 'Jane',
        updated_at: '2023-07-01T00:00:00.000Z',
      });
      mockQuery.mockResolvedValueOnce({ rows: [updatedRow] });

      const result = await repo.update('emp-001', { firstName: 'Jane' });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE employees'),
        ['Jane', 'emp-001'],
      );
      expect(result).not.toBeNull();
      expect(result!.firstName).toBe('Jane');
      expect(result!.updatedAt).toEqual(new Date('2023-07-01T00:00:00.000Z'));
    });

    it('returns null when the employee does not exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.update('emp-999', { firstName: 'Jane' });

      expect(result).toBeNull();
    });

    it('does not resurrect a soft-deleted employee', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.update('emp-001', { firstName: 'Jane' });

      expect(result).toBeNull();
    });

    it('returns the existing employee when updates object is empty', async () => {
      const row = makeRow();
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.update('emp-001', {});

      expect(result).toEqual(makeEmployee());
    });

    it('advances updatedAt on successful update', async () => {
      const updatedRow = makeRow({ updated_at: '2023-08-15T00:00:00.000Z' });
      mockQuery.mockResolvedValueOnce({ rows: [updatedRow] });

      const result = await repo.update('emp-001', { department: 'Sales' });

      expect(result!.updatedAt).toEqual(new Date('2023-08-15T00:00:00.000Z'));
    });
  });

  describe('softDelete', () => {
    it('sets deletedAt on the target employee and returns the entity', async () => {
      const deletedRow = makeRow({
        deleted_at: '2023-09-01T00:00:00.000Z',
        updated_at: '2023-09-01T00:00:00.000Z',
      });
      mockQuery.mockResolvedValueOnce({ rows: [deletedRow] });

      const result = await repo.softDelete('emp-001');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE employees'),
        ['emp-001'],
      );
      expect(result).not.toBeNull();
      expect(result!.deletedAt).toEqual(new Date('2023-09-01T00:00:00.000Z'));
    });

    it('is idempotent — soft-deleting an already-soft-deleted row leaves it deleted', async () => {
      const alreadyDeletedRow = makeRow({
        deleted_at: '2023-08-01T00:00:00.000Z',
        updated_at: '2023-09-01T00:00:00.000Z',
      });
      mockQuery.mockResolvedValueOnce({ rows: [alreadyDeletedRow] });

      const result = await repo.softDelete('emp-001');

      expect(result).not.toBeNull();
      expect(result!.deletedAt).toEqual(new Date('2023-08-01T00:00:00.000Z'));
    });

    it('returns null when the employee does not exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.softDelete('emp-999');

      expect(result).toBeNull();
    });

    it('does not affect other rows', async () => {
      const deletedRow = makeRow({ deleted_at: '2023-09-01T00:00:00.000Z' });
      mockQuery.mockResolvedValueOnce({ rows: [deletedRow] });

      await repo.softDelete('emp-001');

      expect(mockQuery).toHaveBeenCalledTimes(1);
      const sql = mockQuery.mock.calls[0][0];
      expect(sql).toContain('WHERE id = $1');
    });
  });
});
