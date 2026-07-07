
import { EmployeeRepository } from '../../../../src/modules/employee/employee.repository';
import { pool } from '../../../../src/shared/db/connection';
import { Employee } from '../../../../src/modules/employee/employee.model';

jest.mock('../../../../src/shared/db/connection', () => ({
  pool: {
    query: jest.fn(),
  },
}));

const mockQuery = pool.query as jest.Mock;

function makeEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
    id: 'emp-1',
    employeeNumber: 'EMP001',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    managerId: null,
    department: null,
    hireDate: new Date('2023-01-15'),
    terminationDate: null,
    employmentStatus: 'ACTIVE',
    createdAt: new Date('2023-01-15T00:00:00Z'),
    updatedAt: new Date('2023-06-01T00:00:00Z'),
    deletedAt: null,
    ...overrides,
  };
}

function makeRow(employee: Employee): Record<string, unknown> {
  return {
    id: employee.id,
    employee_number: employee.employeeNumber,
    first_name: employee.firstName,
    last_name: employee.lastName,
    email: employee.email,
    manager_id: employee.managerId,
    department: employee.department,
    hire_date: employee.hireDate.toISOString(),
    termination_date: employee.terminationDate?.toISOString() ?? null,
    employment_status: employee.employmentStatus,
    created_at: employee.createdAt.toISOString(),
    updated_at: employee.updatedAt.toISOString(),
    deleted_at: employee.deletedAt?.toISOString() ?? null,
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
      const employee = makeEmployee();
      mockQuery.mockResolvedValueOnce({ rows: [makeRow(employee)] });

      const result = await repo.findById('emp-1');

      expect(result).toEqual(employee);
      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        ['emp-1'],
      );
    });

    it('should return null when employee is not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findById('nonexistent');

      expect(result).toBeNull();
    });

    it('should exclude soft-deleted employees', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await repo.findById('emp-1');

      const sql = mockQuery.mock.calls[0][0] as string;
      expect(sql).toContain('deleted_at IS NULL');
    });
  });

  describe('findByEmployeeNumber', () => {
    it('should return an employee by employee number', async () => {
      const employee = makeEmployee({ employeeNumber: 'EMP001' });
      mockQuery.mockResolvedValueOnce({ rows: [makeRow(employee)] });

      const result = await repo.findByEmployeeNumber('EMP001');

      expect(result).toEqual(employee);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('employee_number = $1'),
        ['EMP001'],
      );
    });

    it('should return null when employee number is not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findByEmployeeNumber('NONEXISTENT');

      expect(result).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should return an employee by email', async () => {
      const employee = makeEmployee({ email: 'john.doe@example.com' });
      mockQuery.mockResolvedValueOnce({ rows: [makeRow(employee)] });

      const result = await repo.findByEmail('john.doe@example.com');

      expect(result).toEqual(employee);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('email = $1'),
        ['john.doe@example.com'],
      );
    });

    it('should return null when email is not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findByEmail('unknown@example.com');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should insert a new employee and return it', async () => {
      const input: Partial<Employee> = {
        employeeNumber: 'EMP002',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com',
        managerId: null,
        department: 'Engineering',
        hireDate: new Date('2024-03-01'),
        employmentStatus: 'ACTIVE',
      };
      const created = makeEmployee({
        id: 'emp-2',
        ...input,
        createdAt: new Date('2024-03-01T00:00:00Z'),
        updatedAt: new Date('2024-03-01T00:00:00Z'),
      });
      mockQuery.mockResolvedValueOnce({ rows: [makeRow(created)] });

      const result = await repo.create(input);

      expect(result).toEqual(created);
      const sql = mockQuery.mock.calls[0][0] as string;
      expect(sql).toContain('INSERT INTO employees');
      expect(sql).toContain('RETURNING');
    });
  });

  describe('update', () => {
    it('should update an employee and return the updated record', async () => {
      const existing = makeEmployee();
      const updates: Partial<Employee> = {
        firstName: 'Jonathan',
        department: 'Marketing',
      };
      const updated = makeEmployee({
        ...existing,
        ...updates,
        updatedAt: new Date('2024-07-01T00:00:00Z'),
      });
      mockQuery.mockResolvedValueOnce({ rows: [makeRow(updated)] });

      const result = await repo.update('emp-1', updates);

      expect(result.firstName).toBe('Jonathan');
      expect(result.department).toBe('Marketing');
      const sql = mockQuery.mock.calls[0][0] as string;
      expect(sql).toContain('UPDATE employees');
      expect(sql).toContain('SET');
      expect(sql).toContain('updated_at = NOW()');
    });

    it('should throw when no fields are provided', async () => {
      await expect(repo.update('emp-1', {})).rejects.toThrow('No fields to update');
    });
  });
});
