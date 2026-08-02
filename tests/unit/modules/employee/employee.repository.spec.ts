import { EmployeeRepository } from '../../../../src/modules/employee/employee.repository';
import { pool } from '../../../../src/shared/db/connection';

jest.mock('../../../../src/shared/db/connection', () => ({
  pool: {
    query: jest.fn(),
  },
}));

const mockQuery = pool.query as jest.Mock;

function makeRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'emp-1',
    employee_number: 'E001',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john@example.com',
    manager_id: 'mgr-1',
    department: 'Engineering',
    hire_date: '2020-01-15T00:00:00.000Z',
    termination_date: null,
    employment_status: 'ACTIVE',
    created_at: '2023-01-01T00:00:00.000Z',
    updated_at: '2023-06-01T00:00:00.000Z',
    deleted_at: null,
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
    it('should return an employee when found', async () => {
      const row = makeRow();
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.findById('emp-1');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('emp-1');
      expect(result!.employeeNumber).toBe('E001');
      expect(result!.firstName).toBe('John');
      expect(result!.lastName).toBe('Doe');
      expect(result!.email).toBe('john@example.com');
      expect(result!.managerId).toBe('mgr-1');
      expect(result!.department).toBe('Engineering');
      expect(result!.hireDate).toBeInstanceOf(Date);
      expect(result!.terminationDate).toBeNull();
      expect(result!.employmentStatus).toBe('ACTIVE');
      expect(result!.createdAt).toBeInstanceOf(Date);
      expect(result!.updatedAt).toBeInstanceOf(Date);
      expect(result!.deletedAt).toBeNull();
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM employees WHERE id = $1 AND deleted_at IS NULL',
        ['emp-1'],
      );
    });

    it('should return null when employee not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findById('nonexistent');

      expect(result).toBeNull();
    });

    it('should return null when employee is soft-deleted', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findById('emp-1');

      expect(result).toBeNull();
    });

    it('should propagate database errors', async () => {
      const dbError = new Error('connection refused');
      mockQuery.mockRejectedValueOnce(dbError);

      await expect(repo.findById('emp-1')).rejects.toThrow('connection refused');
    });
  });

  describe('findByEmployeeNumber', () => {
    it('should return an employee when found by employee number', async () => {
      const row = makeRow();
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.findByEmployeeNumber('E001');

      expect(result).not.toBeNull();
      expect(result!.employeeNumber).toBe('E001');
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM employees WHERE employee_number = $1 AND deleted_at IS NULL',
        ['E001'],
      );
    });

    it('should return null when not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findByEmployeeNumber('E999');

      expect(result).toBeNull();
    });

    it('should propagate database errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('db error'));

      await expect(repo.findByEmployeeNumber('E001')).rejects.toThrow('db error');
    });
  });

  describe('findByManagerId', () => {
    it('should return employees for a given manager', async () => {
      const row1 = makeRow({ id: 'emp-1', employee_number: 'E001' });
      const row2 = makeRow({ id: 'emp-2', employee_number: 'E002' });
      mockQuery.mockResolvedValueOnce({ rows: [row1, row2] });

      const result = await repo.findByManagerId('mgr-1');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('emp-1');
      expect(result[1].id).toBe('emp-2');
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM employees WHERE manager_id = $1 AND deleted_at IS NULL',
        ['mgr-1'],
      );
    });

    it('should return an empty array when no subordinates exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findByManagerId('mgr-empty');

      expect(result).toEqual([]);
    });

    it('should propagate database errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('db error'));

      await expect(repo.findByManagerId('mgr-1')).rejects.toThrow('db error');
    });
  });

  describe('findAll', () => {
    it('should return all non-deleted employees', async () => {
      const row1 = makeRow({ id: 'emp-1' });
      const row2 = makeRow({ id: 'emp-2' });
      mockQuery.mockResolvedValueOnce({ rows: [row1, row2] });

      const result = await repo.findAll();

      expect(result).toHaveLength(2);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM employees WHERE deleted_at IS NULL',
      );
    });

    it('should return an empty array when no active rows exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findAll();

      expect(result).toEqual([]);
    });

    it('should propagate database errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('db error'));

      await expect(repo.findAll()).rejects.toThrow('db error');
    });
  });

  describe('create', () => {
    const createInput = {
      employeeNumber: 'E003',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@example.com',
      managerId: 'mgr-1',
      department: 'Design',
      hireDate: new Date('2021-03-01T00:00:00.000Z'),
      terminationDate: null,
      employmentStatus: 'ACTIVE' as const,
    };

    it('should create and return a fully-populated employee', async () => {
      const returnedRow = makeRow({
        id: 'emp-new',
        employee_number: 'E003',
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'jane@example.com',
        manager_id: 'mgr-1',
        department: 'Design',
        hire_date: '2021-03-01T00:00:00.000Z',
        termination_date: null,
        employment_status: 'ACTIVE',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
        deleted_at: null,
      });
      mockQuery.mockResolvedValueOnce({ rows: [returnedRow] });

      const result = await repo.create(createInput);

      expect(result.id).toBe('emp-new');
      expect(result.employeeNumber).toBe('E003');
      expect(result.firstName).toBe('Jane');
      expect(result.lastName).toBe('Smith');
      expect(result.email).toBe('jane@example.com');
      expect(result.managerId).toBe('mgr-1');
      expect(result.department).toBe('Design');
      expect(result.hireDate).toBeInstanceOf(Date);
      expect(result.terminationDate).toBeNull();
      expect(result.employmentStatus).toBe('ACTIVE');
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
      expect(result.deletedAt).toBeNull();
    });

    it('should propagate unique-constraint violations', async () => {
      const uniqueError = new Error('duplicate key value violates unique constraint');
      mockQuery.mockRejectedValueOnce(uniqueError);

      await expect(repo.create(createInput)).rejects.toThrow('duplicate key value violates unique constraint');
    });

    it('should propagate general database errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('db error'));

      await expect(repo.create(createInput)).rejects.toThrow('db error');
    });
  });

  describe('update', () => {
    it('should update only provided fields and return the updated employee', async () => {
      const updatedRow = makeRow({
        first_name: 'Johnny',
        department: 'Platform',
        updated_at: '2024-02-01T00:00:00.000Z',
      });
      mockQuery.mockResolvedValueOnce({ rows: [updatedRow] });

      const result = await repo.update('emp-1', {
        firstName: 'Johnny',
        department: 'Platform',
      });

      expect(result).not.toBeNull();
      expect(result!.firstName).toBe('Johnny');
      expect(result!.department).toBe('Platform');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE employees SET'),
        expect.arrayContaining(['emp-1', 'Johnny', 'Platform']),
      );
    });

    it('should return null when no matching non-deleted row exists', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.update('nonexistent', { firstName: 'Bob' });

      expect(result).toBeNull();
    });

    it('should not allow updating id, createdAt, or deletedAt', async () => {
      const updatedRow = makeRow();
      mockQuery.mockResolvedValueOnce({ rows: [updatedRow] });

      await repo.update('emp-1', {
        id: 'hacked-id',
        createdAt: new Date('2020-01-01'),
        deletedAt: new Date(),
        firstName: 'Legit',
      });

      const sqlArg = mockQuery.mock.calls[0][0] as string;
      // Extract the SET clause (between SET and WHERE) to verify read-only fields are excluded
      const setClause = sqlArg.match(/SET (.+?) WHERE/s)?.[1] ?? '';
      expect(setClause).not.toContain('id =');
      expect(setClause).not.toContain('created_at');
      expect(setClause).not.toContain('deleted_at');
      expect(setClause).toContain('first_name');
    });

    it('should propagate database errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('db error'));

      await expect(repo.update('emp-1', { firstName: 'Bob' })).rejects.toThrow('db error');
    });
  });

  describe('softDelete', () => {
    it('should set deleted_at for the matching row', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 1 });

      await repo.softDelete('emp-1');

      expect(mockQuery).toHaveBeenCalledWith(
        'UPDATE employees SET deleted_at = NOW() WHERE id = $1',
        ['emp-1'],
      );
    });

    it('should be idempotent when no row matches', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 0 });

      await expect(repo.softDelete('nonexistent')).resolves.toBeUndefined();
    });

    it('should propagate database errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('db error'));

      await expect(repo.softDelete('emp-1')).rejects.toThrow('db error');
    });
  });
});
