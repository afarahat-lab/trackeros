import { EmployeeRepository } from '../../../../src/modules/employee/employee.repository';
import { pool } from '../../../../src/shared/db/connection';
import { Employee, CreateEmployeeDto } from '../../../../src/modules/employee/employee.model';

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
    department: 'Engineering',
    hireDate: new Date('2020-01-15'),
    terminationDate: null,
    employmentStatus: 'ACTIVE',
    createdAt: new Date('2020-01-15T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
    deletedAt: null,
    ...overrides,
  };
}

function makeCreateDto(overrides: Partial<CreateEmployeeDto> = {}): CreateEmployeeDto {
  return {
    employeeNumber: 'EMP001',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    department: 'Engineering',
    hireDate: new Date('2020-01-15'),
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
      const employee = makeEmployee();
      mockQuery.mockResolvedValueOnce({ rows: [employee] });

      const result = await repo.findById('emp-1');

      expect(result).toEqual(employee);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM employees WHERE id = $1 AND deleted_at IS NULL',
        ['emp-1']
      );
    });

    it('should return null when employee is not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return all non-deleted employees ordered by name', async () => {
      const employees = [makeEmployee(), makeEmployee({ id: 'emp-2', firstName: 'Jane' })];
      mockQuery.mockResolvedValueOnce({ rows: employees });

      const result = await repo.findAll();

      expect(result).toEqual(employees);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM employees WHERE deleted_at IS NULL ORDER BY last_name, first_name'
      );
    });

    it('should return empty array when no employees exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findByManagerId', () => {
    it('should return employees for a given manager', async () => {
      const employees = [makeEmployee({ managerId: 'mgr-1' })];
      mockQuery.mockResolvedValueOnce({ rows: employees });

      const result = await repo.findByManagerId('mgr-1');

      expect(result).toEqual(employees);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM employees WHERE manager_id = $1 AND deleted_at IS NULL ORDER BY last_name, first_name',
        ['mgr-1']
      );
    });

    it('should return empty array when manager has no direct reports', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findByManagerId('mgr-empty');

      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    it('should insert a new employee and return it', async () => {
      const dto = makeCreateDto();
      const created = makeEmployee();
      mockQuery.mockResolvedValueOnce({ rows: [created] });

      const result = await repo.create(dto);

      expect(result).toEqual(created);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO employees'),
        [
          dto.employeeNumber,
          dto.firstName,
          dto.lastName,
          dto.email,
          null,
          dto.department,
          dto.hireDate,
          'ACTIVE',
        ]
      );
    });

    it('should use provided employmentStatus when specified', async () => {
      const dto = makeCreateDto({ employmentStatus: 'INACTIVE' });
      const created = makeEmployee({ employmentStatus: 'INACTIVE' });
      mockQuery.mockResolvedValueOnce({ rows: [created] });

      const result = await repo.create(dto);

      expect(result.employmentStatus).toBe('INACTIVE');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO employees'),
        expect.arrayContaining(['INACTIVE'])
      );
    });

    it('should pass managerId when provided', async () => {
      const dto = makeCreateDto({ managerId: 'mgr-1' });
      const created = makeEmployee({ managerId: 'mgr-1' });
      mockQuery.mockResolvedValueOnce({ rows: [created] });

      await repo.create(dto);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO employees'),
        expect.arrayContaining(['mgr-1'])
      );
    });
  });

  describe('update', () => {
    it('should update specified fields and return the updated employee', async () => {
      const updated = makeEmployee({ firstName: 'Jane', lastName: 'Smith' });
      mockQuery.mockResolvedValueOnce({ rows: [updated] });

      const result = await repo.update('emp-1', { firstName: 'Jane', lastName: 'Smith' });

      expect(result).toEqual(updated);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE employees SET'),
        expect.arrayContaining(['Jane', 'Smith', 'emp-1'])
      );
    });

    it('should return null when employee does not exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.update('nonexistent', { firstName: 'Jane' });

      expect(result).toBeNull();
    });

    it('should return existing employee when no fields are provided', async () => {
      const existing = makeEmployee();
      mockQuery.mockResolvedValueOnce({ rows: [existing] });

      const result = await repo.update('emp-1', {});

      expect(result).toEqual(existing);
      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM employees WHERE id = $1 AND deleted_at IS NULL',
        ['emp-1']
      );
    });

    it('should handle null managerId', async () => {
      const updated = makeEmployee({ managerId: null });
      mockQuery.mockResolvedValueOnce({ rows: [updated] });

      await repo.update('emp-1', { managerId: null });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE employees SET'),
        expect.arrayContaining([null, 'emp-1'])
      );
    });
  });

  describe('softDelete', () => {
    it('should soft-delete an employee and return true', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 1 });

      const result = await repo.softDelete('emp-1');

      expect(result).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        'UPDATE employees SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL',
        ['emp-1']
      );
    });

    it('should return false when employee does not exist or is already deleted', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 0 });

      const result = await repo.softDelete('nonexistent');

      expect(result).toBe(false);
    });
  });
});
