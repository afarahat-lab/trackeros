import { Pool } from 'pg';
import { EmployeeRepository } from '../../../../src/modules/employee/employee.repository';
import { Employee } from '../../../../src/modules/employee/employee.model';

jest.mock('pg', () => {
  const mockQuery = jest.fn();
  return {
    Pool: jest.fn().mockImplementation(() => ({
      query: mockQuery,
    })),
  };
});

const mockEmployeeRow: Record<string, unknown> = {
  id: 'emp-001',
  employee_number: 'E001',
  first_name: 'Alice',
  last_name: 'Anderson',
  email: 'alice@example.com',
  manager_id: 'emp-002',
  department: 'Engineering',
  hire_date: '2024-01-15T00:00:00.000Z',
  termination_date: null,
  employment_status: 'ACTIVE',
  created_at: '2024-01-15T00:00:00.000Z',
  updated_at: '2024-06-01T00:00:00.000Z',
};

const mockEmployeeRowNoManager: Record<string, unknown> = {
  id: 'emp-003',
  employee_number: 'E003',
  first_name: 'Bob',
  last_name: 'Builder',
  email: 'bob@example.com',
  manager_id: null,
  department: 'HR',
  hire_date: '2023-03-01T00:00:00.000Z',
  termination_date: null,
  employment_status: 'ACTIVE',
  created_at: '2023-03-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
};

function expectEmployeeMatchesRow(employee: Employee, row: Record<string, unknown>): void {
  expect(employee.id).toBe(row.id);
  expect(employee.employeeNumber).toBe(row.employee_number);
  expect(employee.firstName).toBe(row.first_name);
  expect(employee.lastName).toBe(row.last_name);
  expect(employee.email).toBe(row.email);
  expect(employee.managerId).toBe(row.manager_id ?? null);
  expect(employee.department).toBe(row.department);
  expect(employee.hireDate).toEqual(new Date(row.hire_date as string));
  expect(employee.terminationDate).toBe(row.termination_date ? new Date(row.termination_date as string) : null);
  expect(employee.employmentStatus).toBe(row.employment_status);
  expect(employee.createdAt).toEqual(new Date(row.created_at as string));
  expect(employee.updatedAt).toEqual(new Date(row.updated_at as string));
}

describe('EmployeeRepository', () => {
  let repository: EmployeeRepository;
  let mockQuery: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    const mockPool = new Pool() as jest.Mocked<Pool>;
    mockQuery = mockPool.query as unknown as jest.Mock;
    repository = new EmployeeRepository(mockPool);
  });

  describe('findById', () => {
    it('should return an Employee when a row matches the given id', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockEmployeeRow] });

      const result = await repository.findById('emp-001');

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM employees WHERE id = $1',
        ['emp-001'],
      );
      expect(result).not.toBeNull();
      expectEmployeeMatchesRow(result!, mockEmployeeRow);
    });

    it('should return null when no row matches the given id', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
    });

    it('should use parameterized query to prevent SQL injection', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await repository.findById("1' OR '1'='1");

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM employees WHERE id = $1',
        ["1' OR '1'='1"],
      );
    });

    it('should throw when the pool query fails', async () => {
      mockQuery.mockRejectedValueOnce(new Error('connection refused'));

      await expect(repository.findById('emp-001')).rejects.toThrow(
        'Failed to find employee by id: connection refused',
      );
    });
  });

  describe('findByEmployeeNumber', () => {
    it('should return an Employee when a row matches the given employee number', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockEmployeeRow] });

      const result = await repository.findByEmployeeNumber('E001');

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM employees WHERE employee_number = $1',
        ['E001'],
      );
      expect(result).not.toBeNull();
      expectEmployeeMatchesRow(result!, mockEmployeeRow);
    });

    it('should return null when no row matches the given employee number', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repository.findByEmployeeNumber('E999');

      expect(result).toBeNull();
    });

    it('should use parameterized query to prevent SQL injection', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await repository.findByEmployeeNumber("E001'; DROP TABLE employees; --");

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM employees WHERE employee_number = $1',
        ["E001'; DROP TABLE employees; --"],
      );
    });

    it('should throw when the pool query fails', async () => {
      mockQuery.mockRejectedValueOnce(new Error('connection refused'));

      await expect(repository.findByEmployeeNumber('E001')).rejects.toThrow(
        'Failed to find employee by employee number: connection refused',
      );
    });
  });

  describe('findAll', () => {
    it('should return all employees when rows exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockEmployeeRow, mockEmployeeRowNoManager] });

      const result = await repository.findAll();

      expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM employees');
      expect(result).toHaveLength(2);
      expectEmployeeMatchesRow(result[0], mockEmployeeRow);
      expectEmployeeMatchesRow(result[1], mockEmployeeRowNoManager);
    });

    it('should return an empty array when no rows exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repository.findAll();

      expect(result).toEqual([]);
    });

    it('should throw when the pool query fails', async () => {
      mockQuery.mockRejectedValueOnce(new Error('connection refused'));

      await expect(repository.findAll()).rejects.toThrow(
        'Failed to find all employees: connection refused',
      );
    });
  });

  describe('managerId nullability', () => {
    it('should preserve null managerId for top-level employees', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockEmployeeRowNoManager] });

      const result = await repository.findById('emp-003');

      expect(result).not.toBeNull();
      expect(result!.managerId).toBeNull();
    });

    it('should preserve non-null managerId for employees with a manager', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockEmployeeRow] });

      const result = await repository.findById('emp-001');

      expect(result).not.toBeNull();
      expect(result!.managerId).toBe('emp-002');
    });
  });
});
