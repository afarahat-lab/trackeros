import { EmployeeRepository } from 'modules/employee/employee.repository';
import { pool } from 'shared/db/connection';
import { EmploymentStatus } from 'shared/types';

jest.mock('shared/db/connection', () => ({
  pool: {
    query: jest.fn(),
  },
}));

const mockQuery = pool.query as jest.Mock;

function makeRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'emp-1',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john.doe@example.com',
    role: 'engineer',
    manager_id: 'mgr-1',
    department: 'Engineering',
    employment_status: 'ACTIVE',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-06-15T12:00:00.000Z',
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
    it('should return an Employee when the row exists', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [makeRow()] });

      const result = await repo.findById('emp-1');

      expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM employees WHERE id = $1', ['emp-1']);
      expect(result).not.toBeNull();
      expect(result!.id).toBe('emp-1');
      expect(result!.firstName).toBe('John');
      expect(result!.lastName).toBe('Doe');
      expect(result!.email).toBe('john.doe@example.com');
      expect(result!.role).toBe('engineer');
      expect(result!.managerId).toBe('mgr-1');
      expect(result!.department).toBe('Engineering');
      expect(result!.employmentStatus).toBe(EmploymentStatus.ACTIVE);
      expect(result!.createdAt).toEqual(new Date('2026-01-01T00:00:00.000Z'));
      expect(result!.updatedAt).toEqual(new Date('2026-06-15T12:00:00.000Z'));
    });

    it('should return null when no row exists', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findById('nonexistent');

      expect(result).toBeNull();
    });

    it('should handle null manager_id', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [makeRow({ manager_id: null })] });

      const result = await repo.findById('emp-1');

      expect(result!.managerId).toBeNull();
    });
  });

  describe('findByDepartment', () => {
    it('should return employees for the given department', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [makeRow(), makeRow({ id: 'emp-2', first_name: 'Jane' })],
      });

      const results = await repo.findByDepartment('Engineering');

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM employees WHERE department = $1 ORDER BY last_name, first_name',
        ['Engineering'],
      );
      expect(results).toHaveLength(2);
      expect(results[0].id).toBe('emp-1');
      expect(results[1].id).toBe('emp-2');
    });

    it('should return an empty array when no employees in department', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const results = await repo.findByDepartment('EmptyDept');

      expect(results).toHaveLength(0);
    });
  });

  describe('findAll', () => {
    it('should return all employees ordered by name', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          makeRow({ id: 'emp-1', last_name: 'Avery' }),
          makeRow({ id: 'emp-2', last_name: 'Brown' }),
        ],
      });

      const results = await repo.findAll();

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM employees ORDER BY last_name, first_name',
      );
      expect(results).toHaveLength(2);
    });

    it('should return an empty array when no employees exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const results = await repo.findAll();

      expect(results).toHaveLength(0);
    });
  });

  describe('create', () => {
    it('should insert a new employee and return it', async () => {
      const input = {
        firstName: 'Alice',
        lastName: 'Smith',
        email: 'alice@example.com',
        role: 'manager',
        managerId: null,
        department: 'HR',
        employmentStatus: EmploymentStatus.ACTIVE,
      };

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'emp-new',
            first_name: 'Alice',
            last_name: 'Smith',
            email: 'alice@example.com',
            role: 'manager',
            manager_id: null,
            department: 'HR',
            employment_status: 'ACTIVE',
            created_at: '2026-08-01T00:00:00.000Z',
            updated_at: '2026-08-01T00:00:00.000Z',
          },
        ],
      });

      const result = await repo.create(input);

      expect(mockQuery).toHaveBeenCalledWith(
        `INSERT INTO employees (first_name, last_name, email, role, manager_id, department, employment_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
        ['Alice', 'Smith', 'alice@example.com', 'manager', null, 'HR', 'ACTIVE'],
      );
      expect(result.id).toBe('emp-new');
      expect(result.firstName).toBe('Alice');
      expect(result.managerId).toBeNull();
    });
  });

  describe('update', () => {
    it('should update specified fields and return the updated employee', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          makeRow({
            first_name: 'Johnny',
            department: 'Design',
            updated_at: '2026-08-01T00:00:00.000Z',
          }),
        ],
      });

      const result = await repo.update('emp-1', {
        firstName: 'Johnny',
        department: 'Design',
      });

      expect(mockQuery).toHaveBeenCalledWith(
        `UPDATE employees SET first_name = $1, department = $2, updated_at = NOW() WHERE id = $3 RETURNING *`,
        ['Johnny', 'Design', 'emp-1'],
      );
      expect(result).not.toBeNull();
      expect(result!.firstName).toBe('Johnny');
      expect(result!.department).toBe('Design');
    });

    it('should return null when employee does not exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.update('nonexistent', { firstName: 'X' });

      expect(result).toBeNull();
    });

    it('should return the existing employee when no fields are provided', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [makeRow()] });

      const result = await repo.update('emp-1', {});

      // Should fall back to findById when no fields to update
      expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM employees WHERE id = $1', ['emp-1']);
      expect(result).not.toBeNull();
      expect(result!.id).toBe('emp-1');
    });

    it('should handle updating managerId to null', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [makeRow({ manager_id: null })],
      });

      const result = await repo.update('emp-1', { managerId: null });

      expect(mockQuery).toHaveBeenCalledWith(
        `UPDATE employees SET manager_id = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
        [null, 'emp-1'],
      );
      expect(result!.managerId).toBeNull();
    });
  });
});
