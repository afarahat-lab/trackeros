import { PgEmployeeRepository } from '../../../../src/modules/employee/employee.repository';
import { Employee } from '../../../../src/modules/employee/employee.model';
import { EmploymentStatus } from '../../../../src/shared/types';

const mockQuery = jest.fn();
jest.mock('../../../../src/shared/db/connection', () => ({
  pool: {
    query: (...args: unknown[]) => mockQuery(...args),
  },
}));

function makeEmployeeRow(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    id: 'emp-1',
    employee_number: 'EMP001',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john@example.com',
    manager_id: null,
    department: null,
    hire_date: '2023-01-15T00:00:00.000Z',
    termination_date: null,
    employment_status: 'active',
    created_at: '2023-01-15T00:00:00.000Z',
    updated_at: '2023-06-01T00:00:00.000Z',
    deleted_at: null,
    ...overrides,
  };
}

function expectedEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
    id: 'emp-1',
    employeeNumber: 'EMP001',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    managerId: null,
    department: null,
    hireDate: new Date('2023-01-15T00:00:00.000Z'),
    terminationDate: null,
    employmentStatus: EmploymentStatus.active,
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
    it('should return an employee when found', async () => {
      const row = makeEmployeeRow();
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.findById('emp-1');

      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('SELECT'), ['emp-1']);
      expect(result).toEqual(expectedEmployee());
    });

    it('should return null when not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByEmployeeNumber', () => {
    it('should return an employee when found', async () => {
      const row = makeEmployeeRow({ employee_number: 'EMP999' });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.findByEmployeeNumber('EMP999');

      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('employee_number'), ['EMP999']);
      expect(result).toEqual(expectedEmployee({ employeeNumber: 'EMP999' }));
    });

    it('should return null when not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findByEmployeeNumber('NONEXISTENT');

      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return all non-deleted employees', async () => {
      const row1 = makeEmployeeRow();
      const row2 = makeEmployeeRow({ id: 'emp-2', employee_number: 'EMP002' });
      mockQuery.mockResolvedValueOnce({ rows: [row1, row2] });

      const result = await repo.findAll();

      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('deleted_at IS NULL'));
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(expectedEmployee());
      expect(result[1]).toEqual(expectedEmployee({ id: 'emp-2', employeeNumber: 'EMP002' }));
    });

    it('should return empty array when no non-deleted employees exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    it('should insert and return a new employee', async () => {
      const input = {
        employeeNumber: 'NEW001',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        managerId: null,
        department: 'Engineering',
        hireDate: new Date('2024-01-10T00:00:00.000Z'),
        terminationDate: null,
        employmentStatus: EmploymentStatus.active,
      };

      const row = makeEmployeeRow({
        id: 'emp-new',
        employee_number: 'NEW001',
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'jane@example.com',
        department: 'Engineering',
        hire_date: '2024-01-10T00:00:00.000Z',
        created_at: '2024-01-10T00:00:00.000Z',
        updated_at: '2024-01-10T00:00:00.000Z',
      });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.create(input);

      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO employees'), [
        'NEW001', 'Jane', 'Smith', 'jane@example.com', null, 'Engineering',
        input.hireDate, null, 'active',
      ]);
      expect(result.id).toBe('emp-new');
      expect(result.employeeNumber).toBe('NEW001');
      expect(result.deletedAt).toBeNull();
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('update', () => {
    it('should update and return the modified employee', async () => {
      const row = makeEmployeeRow({ first_name: 'Updated', department: 'HR' });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.update('emp-1', { firstName: 'Updated', department: 'HR' });

      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('UPDATE employees'), expect.any(Array));
      expect(result).not.toBeNull();
      expect(result!.firstName).toBe('Updated');
      expect(result!.department).toBe('HR');
    });

    it('should return null when employee does not exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.update('nonexistent', { firstName: 'X' });

      expect(result).toBeNull();
    });
  });

  describe('softDelete', () => {
    it('should set deleted_at to a timestamp', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await repo.softDelete('emp-1');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE employees SET deleted_at = NOW()'),
        ['emp-1']
      );
    });

    it('should not throw when employee does not exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(repo.softDelete('nonexistent')).resolves.toBeUndefined();
    });
  });
});
