import { EmployeeRepository } from 'modules/employee/employee.repository';
import { Employee } from 'modules/employee/employee.model';

function makeEmployeeRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: overrides.id ?? 'emp-1',
    email: overrides.email ?? 'alice@example.com',
    full_name: overrides.full_name ?? 'Alice Smith',
    role: overrides.role ?? 'EMPLOYEE',
    manager_id: overrides.manager_id !== undefined ? overrides.manager_id : 'mgr-1',
    department: overrides.department ?? 'Engineering',
    employment_status: overrides.employment_status ?? 'ACTIVE',
    created_at: overrides.created_at ?? new Date('2026-01-01'),
    updated_at: overrides.updated_at ?? new Date('2026-06-15'),
  };
}

function expectedEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
    id: 'emp-1',
    email: 'alice@example.com',
    fullName: 'Alice Smith',
    role: 'EMPLOYEE',
    managerId: 'mgr-1',
    department: 'Engineering',
    employmentStatus: 'ACTIVE',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-06-15'),
    ...overrides,
  };
}

describe('EmployeeRepository', () => {
  let mockQuery: jest.Mock;
  let repo: EmployeeRepository;

  beforeEach(() => {
    mockQuery = jest.fn();
    repo = new EmployeeRepository({ query: mockQuery } as unknown as import('pg').Pool);
  });

  describe('findById', () => {
    it('should return an Employee when a matching row exists', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [makeEmployeeRow()] });

      const result = await repo.findById('emp-1');

      expect(result).toEqual(expectedEmployee());
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        ['emp-1']
      );
    });

    it('should return null when no row matches the id', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findById('nonexistent');

      expect(result).toBeNull();
    });

    it('should return null when the row fails the type guard', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'x', email: null, full_name: null, role: null, manager_id: null, department: null, employment_status: null, created_at: null, updated_at: null }],
      });

      const result = await repo.findById('bad-row');

      expect(result).toBeNull();
    });

    it('should propagate pool errors as rejected promises', async () => {
      const dbError = new Error('connection refused');
      mockQuery.mockRejectedValueOnce(dbError);

      await expect(repo.findById('emp-1')).rejects.toThrow('connection refused');
    });
  });

  describe('findByEmail', () => {
    it('should return an Employee when a matching row exists', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [makeEmployeeRow()] });

      const result = await repo.findByEmail('alice@example.com');

      expect(result).toEqual(expectedEmployee());
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        ['alice@example.com']
      );
    });

    it('should return null when no row matches the email', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findByEmail('nobody@example.com');

      expect(result).toBeNull();
    });

    it('should propagate pool errors as rejected promises', async () => {
      const dbError = new Error('connection refused');
      mockQuery.mockRejectedValueOnce(dbError);

      await expect(repo.findByEmail('alice@example.com')).rejects.toThrow('connection refused');
    });
  });

  describe('findManagerId', () => {
    it('should return the manager_id when the employee exists and has a manager', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ manager_id: 'mgr-1' }],
      });

      const result = await repo.findManagerId('emp-1');

      expect(result).toBe('mgr-1');
    });

    it('should return null when the employee exists but has no manager', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ manager_id: null }],
      });

      const result = await repo.findManagerId('emp-no-mgr');

      expect(result).toBeNull();
    });

    it('should return null when the employee does not exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findManagerId('nonexistent');

      expect(result).toBeNull();
    });

    it('should propagate pool errors as rejected promises', async () => {
      const dbError = new Error('connection refused');
      mockQuery.mockRejectedValueOnce(dbError);

      await expect(repo.findManagerId('emp-1')).rejects.toThrow('connection refused');
    });
  });

  describe('findHrAdmins', () => {
    it('should return all employees with HR_ADMIN role', async () => {
      const hrRow1 = makeEmployeeRow({ id: 'hr-1', role: 'HR_ADMIN', full_name: 'HR One' });
      const hrRow2 = makeEmployeeRow({ id: 'hr-2', role: 'HR_ADMIN', full_name: 'HR Two' });
      mockQuery.mockResolvedValueOnce({ rows: [hrRow1, hrRow2] });

      const result = await repo.findHrAdmins();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(expectedEmployee({ id: 'hr-1', fullName: 'HR One', role: 'HR_ADMIN' }));
      expect(result[1]).toEqual(expectedEmployee({ id: 'hr-2', fullName: 'HR Two', role: 'HR_ADMIN' }));
    });

    it('should return an empty array when no HR admins exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findHrAdmins();

      expect(result).toEqual([]);
    });

    it('should filter out rows that fail the type guard', async () => {
      const badRow = { id: 'bad', email: null, full_name: null, role: 'HR_ADMIN', manager_id: null, department: null, employment_status: null, created_at: null, updated_at: null };
      const goodRow = makeEmployeeRow({ id: 'hr-1', role: 'HR_ADMIN' });
      mockQuery.mockResolvedValueOnce({ rows: [badRow, goodRow] });

      const result = await repo.findHrAdmins();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('hr-1');
    });

    it('should propagate pool errors as rejected promises', async () => {
      const dbError = new Error('connection refused');
      mockQuery.mockRejectedValueOnce(dbError);

      await expect(repo.findHrAdmins()).rejects.toThrow('connection refused');
    });
  });
});
