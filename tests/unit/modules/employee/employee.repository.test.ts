import { EmployeeRepository } from 'modules/employee/employee.repository';
import { pool } from 'shared/db/connection';
import { EmploymentStatus } from 'shared/types/index';

jest.mock('shared/db/connection', () => ({
  pool: {
    query: jest.fn(),
  },
}));

const mockQuery = pool.query as jest.Mock;

function makeRow(overrides: Record<string, unknown> = {}) {
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
    created_at: new Date('2020-01-15T09:00:00Z'),
    updated_at: new Date('2025-06-01T12:00:00Z'),
    deleted_at: null,
    ...overrides,
  };
}

function makeEmployee(overrides: Record<string, unknown> = {}) {
  return {
    id: 'emp-1',
    employeeNumber: 'EMP001',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    managerId: 'mgr-1',
    department: 'Engineering',
    hireDate: new Date('2020-01-15'),
    terminationDate: null,
    employmentStatus: EmploymentStatus.ACTIVE,
    createdAt: new Date('2020-01-15T09:00:00Z'),
    updatedAt: new Date('2025-06-01T12:00:00Z'),
    deletedAt: null,
    ...overrides,
  };
}

describe('EmployeeRepository', () => {
  let repo: EmployeeRepository;

  beforeEach(() => {
    repo = new EmployeeRepository();
    mockQuery.mockReset();
  });

  describe('findById', () => {
    it('returns an employee when found and not soft-deleted', async () => {
      const row = makeRow();
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.findById('emp-1');

      expect(result).toEqual(makeEmployee());
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM employees WHERE id = $1 AND deleted_at IS NULL',
        ['emp-1'],
      );
    });

    it('returns null when no row matches', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findById('nonexistent');

      expect(result).toBeNull();
    });

    it('propagates database errors as rejected promises', async () => {
      const dbError = new Error('connection refused');
      mockQuery.mockRejectedValueOnce(dbError);

      await expect(repo.findById('emp-1')).rejects.toThrow('connection refused');
    });
  });

  describe('findByEmail', () => {
    it('returns an employee when email matches a non-deleted row', async () => {
      const row = makeRow({ email: 'jane@example.com', first_name: 'Jane' });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.findByEmail('jane@example.com');

      expect(result).toEqual(makeEmployee({ email: 'jane@example.com', firstName: 'Jane' }));
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM employees WHERE email = $1 AND deleted_at IS NULL',
        ['jane@example.com'],
      );
    });

    it('returns null when no row matches', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findByEmail('unknown@example.com');

      expect(result).toBeNull();
    });

    it('propagates database errors as rejected promises', async () => {
      mockQuery.mockRejectedValueOnce(new Error('timeout'));

      await expect(repo.findByEmail('john@example.com')).rejects.toThrow('timeout');
    });
  });

  describe('findByManagerId', () => {
    it('returns all non-deleted employees for a given manager', async () => {
      const row1 = makeRow({ id: 'emp-1', first_name: 'Alice' });
      const row2 = makeRow({ id: 'emp-2', first_name: 'Bob' });
      mockQuery.mockResolvedValueOnce({ rows: [row1, row2] });

      const result = await repo.findByManagerId('mgr-1');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(makeEmployee({ id: 'emp-1', firstName: 'Alice' }));
      expect(result[1]).toEqual(makeEmployee({ id: 'emp-2', firstName: 'Bob' }));
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM employees WHERE manager_id = $1 AND deleted_at IS NULL',
        ['mgr-1'],
      );
    });

    it('returns an empty array when no reports exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findByManagerId('mgr-empty');

      expect(result).toEqual([]);
    });

    it('propagates database errors as rejected promises', async () => {
      mockQuery.mockRejectedValueOnce(new Error('disk full'));

      await expect(repo.findByManagerId('mgr-1')).rejects.toThrow('disk full');
    });
  });

  describe('findAll', () => {
    it('returns all non-deleted employees when no filters are provided', async () => {
      const row1 = makeRow({ id: 'emp-1' });
      const row2 = makeRow({ id: 'emp-2' });
      mockQuery.mockResolvedValueOnce({ rows: [row1, row2] });

      const result = await repo.findAll();

      expect(result).toHaveLength(2);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM employees WHERE deleted_at IS NULL',
        [],
      );
    });

    it('filters by employmentStatus', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await repo.findAll({ employmentStatus: EmploymentStatus.ACTIVE });

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM employees WHERE deleted_at IS NULL AND employment_status = $1',
        ['ACTIVE'],
      );
    });

    it('filters by department', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await repo.findAll({ department: 'Engineering' });

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM employees WHERE deleted_at IS NULL AND department = $1',
        ['Engineering'],
      );
    });

    it('filters by managerId', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await repo.findAll({ managerId: 'mgr-1' });

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM employees WHERE deleted_at IS NULL AND manager_id = $1',
        ['mgr-1'],
      );
    });

    it('combines multiple filters', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await repo.findAll({
        employmentStatus: EmploymentStatus.ACTIVE,
        department: 'Engineering',
        managerId: 'mgr-1',
      });

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM employees WHERE deleted_at IS NULL AND employment_status = $1 AND department = $2 AND manager_id = $3',
        ['ACTIVE', 'Engineering', 'mgr-1'],
      );
    });

    it('omits undefined filter fields', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await repo.findAll({ department: 'Engineering' });

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM employees WHERE deleted_at IS NULL AND department = $1',
        ['Engineering'],
      );
    });

    it('propagates database errors as rejected promises', async () => {
      mockQuery.mockRejectedValueOnce(new Error('table not found'));

      await expect(repo.findAll()).rejects.toThrow('table not found');
    });
  });

  describe('create', () => {
    it('persists a new employee and returns the created entity', async () => {
      const input = {
        id: 'emp-new',
        employeeNumber: 'EMP010',
        firstName: 'Alice',
        lastName: 'Smith',
        email: 'alice@example.com',
        managerId: 'mgr-1',
        department: 'HR',
        hireDate: new Date('2022-03-01'),
        terminationDate: null,
        employmentStatus: EmploymentStatus.ACTIVE,
      };

      const returnedRow = makeRow({
        id: 'emp-new',
        employee_number: 'EMP010',
        first_name: 'Alice',
        last_name: 'Smith',
        email: 'alice@example.com',
        manager_id: 'mgr-1',
        department: 'HR',
        hire_date: new Date('2022-03-01'),
        termination_date: null,
        employment_status: 'ACTIVE',
      });

      mockQuery.mockResolvedValueOnce({ rows: [returnedRow] });

      const result = await repo.create(input);

      expect(result).toEqual(makeEmployee({
        id: 'emp-new',
        employeeNumber: 'EMP010',
        firstName: 'Alice',
        lastName: 'Smith',
        email: 'alice@example.com',
        managerId: 'mgr-1',
        department: 'HR',
        hireDate: new Date('2022-03-01'),
        terminationDate: null,
      }));

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO employees'),
        [
          'emp-new', 'EMP010', 'Alice', 'Smith', 'alice@example.com',
          'mgr-1', 'HR', new Date('2022-03-01'), null, 'ACTIVE',
        ],
      );
    });

    it('propagates unique constraint violations as rejected promises', async () => {
      const dbError = new Error('duplicate key value violates unique constraint');
      mockQuery.mockRejectedValueOnce(dbError);

      const input = {
        id: 'emp-dup',
        employeeNumber: 'EMP001',
        firstName: 'Dup',
        lastName: 'User',
        email: 'dup@example.com',
        managerId: null,
        department: null,
        hireDate: new Date('2022-01-01'),
        terminationDate: null,
        employmentStatus: EmploymentStatus.ACTIVE,
      };

      await expect(repo.create(input)).rejects.toThrow('duplicate key value');
    });
  });

  describe('update', () => {
    it('applies only supplied mutable fields and returns the updated employee', async () => {
      const updatedRow = makeRow({
        first_name: 'Jane',
        last_name: 'Smith',
        department: 'Marketing',
      });
      mockQuery.mockResolvedValueOnce({ rows: [updatedRow] });

      const result = await repo.update('emp-1', {
        firstName: 'Jane',
        lastName: 'Smith',
        department: 'Marketing',
      });

      expect(result).toEqual(makeEmployee({
        firstName: 'Jane',
        lastName: 'Smith',
        department: 'Marketing',
      }));
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE employees SET'),
        ['Jane', 'Smith', 'Marketing', 'emp-1'],
      );
    });

    it('returns null when no live row matches the id', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.update('nonexistent', { firstName: 'X' });

      expect(result).toBeNull();
    });

    it('excludes id from the mutable field set', async () => {
      const updatedRow = makeRow();
      mockQuery.mockResolvedValueOnce({ rows: [updatedRow] });

      await repo.update('emp-1', { firstName: 'NewName' });

      const sqlCall = mockQuery.mock.calls[0][0] as string;
      const setClause = sqlCall.split(' WHERE ')[0];
      expect(setClause).not.toContain('id');
    });

    it('excludes createdAt from the mutable field set', async () => {
      const updatedRow = makeRow();
      mockQuery.mockResolvedValueOnce({ rows: [updatedRow] });

      await repo.update('emp-1', { firstName: 'NewName' });

      const sqlCall = mockQuery.mock.calls[0][0] as string;
      const setClause = sqlCall.split(' WHERE ')[0];
      expect(setClause).not.toContain('created_at');
    });

    it('excludes deletedAt from the mutable field set', async () => {
      const updatedRow = makeRow();
      mockQuery.mockResolvedValueOnce({ rows: [updatedRow] });

      await repo.update('emp-1', { firstName: 'NewName' });

      const sqlCall = mockQuery.mock.calls[0][0] as string;
      const setClause = sqlCall.split(' WHERE ')[0];
      expect(setClause).not.toContain('deleted_at');
    });

    it('returns the existing employee when no mutable fields are supplied', async () => {
      const row = makeRow();
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.update('emp-1', {});

      expect(result).toEqual(makeEmployee());
      // findById was called, not UPDATE
      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM employees WHERE id = $1 AND deleted_at IS NULL',
        ['emp-1'],
      );
    });

    it('propagates database errors as rejected promises', async () => {
      mockQuery.mockRejectedValueOnce(new Error('check constraint violation'));

      await expect(repo.update('emp-1', { firstName: 'X' })).rejects.toThrow('check constraint');
    });
  });

  describe('softDelete', () => {
    it('sets deleted_at and returns true when a live row is affected', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 1 });

      const result = await repo.softDelete('emp-1');

      expect(result).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        'UPDATE employees SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL',
        ['emp-1'],
      );
    });

    it('returns false when no live row matched (already deleted)', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 0 });

      const result = await repo.softDelete('emp-already-deleted');

      expect(result).toBe(false);
    });

    it('returns false when the employee does not exist', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 0 });

      const result = await repo.softDelete('nonexistent');

      expect(result).toBe(false);
    });

    it('propagates database errors as rejected promises', async () => {
      mockQuery.mockRejectedValueOnce(new Error('permission denied'));

      await expect(repo.softDelete('emp-1')).rejects.toThrow('permission denied');
    });
  });
});
