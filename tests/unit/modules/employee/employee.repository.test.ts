import { EmployeeRepository } from '../../../../src/modules/employee/employee.repository';

const mockQuery = jest.fn();
jest.mock('../../../../src/shared/db/connection', () => ({
  pool: {
    query: (...args: unknown[]) => mockQuery(...args),
  },
}));

describe('EmployeeRepository', () => {
  let repo: EmployeeRepository;

  const employeeRow = {
    id: 'emp-1',
    full_name: 'Alice Smith',
    email: 'alice@example.com',
    department: 'Engineering',
    manager_id: 'mgr-1',
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-06-01'),
  };

  beforeEach(() => {
    repo = new EmployeeRepository();
    mockQuery.mockReset();
  });

  describe('findById', () => {
    it('returns an Employee when the row exists', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [employeeRow] });

      const result = await repo.findById('emp-1');

      expect(result).toEqual({
        id: 'emp-1',
        fullName: 'Alice Smith',
        email: 'alice@example.com',
        department: 'Engineering',
        managerId: 'mgr-1',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-06-01'),
      });
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT id, full_name, email, department, manager_id, created_at, updated_at FROM employees WHERE id = $1',
        ['emp-1'],
      );
    });

    it('returns null when no row matches', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('returns an Employee when the row exists', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [employeeRow] });

      const result = await repo.findByEmail('alice@example.com');

      expect(result).toEqual({
        id: 'emp-1',
        fullName: 'Alice Smith',
        email: 'alice@example.com',
        department: 'Engineering',
        managerId: 'mgr-1',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-06-01'),
      });
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT id, full_name, email, department, manager_id, created_at, updated_at FROM employees WHERE email = $1',
        ['alice@example.com'],
      );
    });

    it('returns null when no row matches', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findByEmail('unknown@example.com');

      expect(result).toBeNull();
    });
  });

  describe('findByDepartment', () => {
    it('returns employees in the department', async () => {
      const row2 = { ...employeeRow, id: 'emp-2', full_name: 'Bob Jones', email: 'bob@example.com' };
      mockQuery.mockResolvedValueOnce({ rows: [employeeRow, row2] });

      const result = await repo.findByDepartment('Engineering');

      expect(result).toHaveLength(2);
      expect(result[0].fullName).toBe('Alice Smith');
      expect(result[1].fullName).toBe('Bob Jones');
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT id, full_name, email, department, manager_id, created_at, updated_at FROM employees WHERE department = $1',
        ['Engineering'],
      );
    });

    it('returns an empty array when no employees match', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findByDepartment('Nonexistent');

      expect(result).toEqual([]);
    });
  });
});
