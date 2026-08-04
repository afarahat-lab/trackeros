import { PgEmployeeRepository } from 'modules/employee';
import { Employee } from 'modules/employee';
import { pool } from 'shared/db/connection';

jest.mock('shared/db/connection', () => ({
  pool: {
    query: jest.fn(),
  },
}));

const mockQuery = pool.query as jest.Mock;

function makeEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
    id: 'emp-001',
    employeeNumber: 'E001',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    managerId: 'emp-002',
    department: 'Engineering',
    hireDate: new Date('2020-01-15'),
    terminationDate: null,
    employmentStatus: 'ACTIVE',
    createdAt: new Date('2020-01-15T09:00:00Z'),
    updatedAt: new Date('2024-01-01T12:00:00Z'),
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
    hire_date: employee.hireDate,
    termination_date: employee.terminationDate,
    employment_status: employee.employmentStatus,
    created_at: employee.createdAt,
    updated_at: employee.updatedAt,
    deleted_at: employee.deletedAt,
  };
}

describe('PgEmployeeRepository', () => {
  let repo: PgEmployeeRepository;

  beforeEach(() => {
    repo = new PgEmployeeRepository();
    mockQuery.mockReset();
  });

  describe('findById', () => {
    it('should return an employee when found', async () => {
      const employee = makeEmployee();
      mockQuery.mockResolvedValueOnce({ rows: [makeRow(employee)] });

      const result = await repo.findById('emp-001');

      expect(result).toEqual(employee);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM employees WHERE id = $1 AND deleted_at IS NULL',
        ['emp-001']
      );
    });

    it('should return null when not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByEmployeeNumber', () => {
    it('should return an employee when found', async () => {
      const employee = makeEmployee();
      mockQuery.mockResolvedValueOnce({ rows: [makeRow(employee)] });

      const result = await repo.findByEmployeeNumber('E001');

      expect(result).toEqual(employee);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM employees WHERE employee_number = $1 AND deleted_at IS NULL',
        ['E001']
      );
    });

    it('should return null when not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findByEmployeeNumber('E999');

      expect(result).toBeNull();
    });
  });

  describe('findByManagerId', () => {
    it('should return employees for a given manager', async () => {
      const emp1 = makeEmployee({ id: 'emp-001' });
      const emp2 = makeEmployee({ id: 'emp-003', employeeNumber: 'E003' });
      mockQuery.mockResolvedValueOnce({ rows: [makeRow(emp1), makeRow(emp2)] });

      const result = await repo.findByManagerId('emp-002');

      expect(result).toHaveLength(2);
      expect(result).toEqual([emp1, emp2]);
    });

    it('should return empty array when no employees found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findByManagerId('emp-999');

      expect(result).toEqual([]);
    });
  });

  describe('findByDepartment', () => {
    it('should return employees for a given department', async () => {
      const emp1 = makeEmployee({ id: 'emp-001' });
      mockQuery.mockResolvedValueOnce({ rows: [makeRow(emp1)] });

      const result = await repo.findByDepartment('Engineering');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(emp1);
    });

    it('should return empty array when no employees found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findByDepartment('Nonexistent');

      expect(result).toEqual([]);
    });
  });

  describe('findActive', () => {
    it('should return only active employees', async () => {
      const emp1 = makeEmployee({ id: 'emp-001', employmentStatus: 'ACTIVE' });
      const emp2 = makeEmployee({ id: 'emp-003', employeeNumber: 'E003', employmentStatus: 'ACTIVE' });
      mockQuery.mockResolvedValueOnce({ rows: [makeRow(emp1), makeRow(emp2)] });

      const result = await repo.findActive();

      expect(result).toHaveLength(2);
      expect(result).toEqual([emp1, emp2]);
    });

    it('should return empty array when no active employees', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findActive();

      expect(result).toEqual([]);
    });
  });

  describe('save', () => {
    it('should insert and return the employee', async () => {
      const employee = makeEmployee();
      mockQuery.mockResolvedValueOnce({ rows: [makeRow(employee)] });

      const result = await repo.save(employee);

      expect(result).toEqual(employee);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO employees'),
        [
          employee.id,
          employee.employeeNumber,
          employee.firstName,
          employee.lastName,
          employee.email,
          employee.managerId,
          employee.department,
          employee.hireDate,
          employee.terminationDate,
          employee.employmentStatus,
          employee.createdAt,
          employee.updatedAt,
          employee.deletedAt,
        ]
      );
    });
  });

  describe('update', () => {
    it('should update and return the employee when found', async () => {
      const existing = makeEmployee();
      mockQuery.mockResolvedValueOnce({ rows: [makeRow(existing)] }); // findById

      const updated = makeEmployee({ firstName: 'Jane', lastName: 'Smith' });
      mockQuery.mockResolvedValueOnce({ rows: [makeRow(updated)] }); // update

      const result = await repo.update('emp-001', { firstName: 'Jane', lastName: 'Smith' });

      expect(result).not.toBeNull();
      expect(result!.firstName).toBe('Jane');
      expect(result!.lastName).toBe('Smith');
    });

    it('should return null when employee not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] }); // findById returns null

      const result = await repo.update('nonexistent', { firstName: 'Jane' });

      expect(result).toBeNull();
    });
  });

  describe('softDelete', () => {
    it('should set deleted_at on the employee', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 1 });

      await repo.softDelete('emp-001');

      expect(mockQuery).toHaveBeenCalledWith(
        'UPDATE employees SET deleted_at = $1, updated_at = $1 WHERE id = $2 AND deleted_at IS NULL',
        [expect.any(Date), 'emp-001']
      );
    });
  });
});
