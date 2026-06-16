import { Pool } from 'pg';
import { EmployeeRepository } from '../../../../src/modules/employee/employee.repository';
import { Employee, CreateEmployeeDto, UpdateEmployeeDto } from '../../../../src/modules/employee/employee.model';

jest.mock('pg', () => {
  const mPool = {
    query: jest.fn(),
  };
  return { Pool: jest.fn(() => mPool) };
});

describe('EmployeeRepository', () => {
  let pool: any;
  let repository: EmployeeRepository;

  const mockEmployeeRow = {
    id: 'emp-1',
    employee_number: 'E001',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john.doe@example.com',
    manager_id: 'mgr-1',
    hire_date: new Date('2020-01-15'),
    termination_date: null,
    is_active: true,
    created_at: new Date('2023-01-01T00:00:00Z'),
    updated_at: new Date('2023-06-01T00:00:00Z'),
  };

  const expectedEmployee: Employee = {
    id: 'emp-1',
    employeeNumber: 'E001',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    managerId: 'mgr-1',
    hireDate: new Date('2020-01-15'),
    terminationDate: null,
    isActive: true,
    createdAt: new Date('2023-01-01T00:00:00Z'),
    updatedAt: new Date('2023-06-01T00:00:00Z'),
  };

  beforeEach(() => {
    pool = new Pool();
    repository = new EmployeeRepository(pool);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should insert a new employee and return the mapped Employee', async () => {
      const dto: CreateEmployeeDto = {
        employeeNumber: 'E001',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        managerId: 'mgr-1',
        hireDate: new Date('2020-01-15'),
        terminationDate: null,
      };

      pool.query.mockResolvedValueOnce({ rows: [mockEmployeeRow] });

      const result = await repository.create(dto);

      expect(pool.query).toHaveBeenCalledTimes(1);
      const [sql, values] = pool.query.mock.calls[0];
      expect(sql).toContain('INSERT INTO employees');
      expect(values).toEqual([
        dto.employeeNumber,
        dto.firstName,
        dto.lastName,
        dto.email,
        dto.managerId,
        dto.hireDate,
        dto.terminationDate,
      ]);
      expect(result).toEqual(expectedEmployee);
    });
  });

  describe('findById', () => {
    it('should return an employee when found', async () => {
      pool.query.mockResolvedValueOnce({ rows: [mockEmployeeRow] });

      const result = await repository.findById('emp-1');

      expect(pool.query).toHaveBeenCalledWith('SELECT * FROM employees WHERE id = $1', ['emp-1']);
      expect(result).toEqual(expectedEmployee);
    });

    it('should return null when not found', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByEmployeeNumber', () => {
    it('should return an employee when found', async () => {
      pool.query.mockResolvedValueOnce({ rows: [mockEmployeeRow] });

      const result = await repository.findByEmployeeNumber('E001');

      expect(pool.query).toHaveBeenCalledWith('SELECT * FROM employees WHERE employee_number = $1', ['E001']);
      expect(result).toEqual(expectedEmployee);
    });

    it('should return null when not found', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const result = await repository.findByEmployeeNumber('E999');

      expect(result).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should return an employee when found', async () => {
      pool.query.mockResolvedValueOnce({ rows: [mockEmployeeRow] });

      const result = await repository.findByEmail('john.doe@example.com');

      expect(pool.query).toHaveBeenCalledWith('SELECT * FROM employees WHERE email = $1', ['john.doe@example.com']);
      expect(result).toEqual(expectedEmployee);
    });

    it('should return null when not found', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const result = await repository.findByEmail('unknown@example.com');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update provided fields and return the updated employee', async () => {
      const dto: UpdateEmployeeDto = {
        firstName: 'Jane',
        isActive: false,
      };

      const updatedRow = {
        ...mockEmployeeRow,
        first_name: 'Jane',
        is_active: false,
        updated_at: new Date('2023-07-01T00:00:00Z'),
      };

      pool.query.mockResolvedValueOnce({ rows: [updatedRow] });

      const result = await repository.update('emp-1', dto);

      expect(pool.query).toHaveBeenCalledTimes(1);
      const [sql, values] = pool.query.mock.calls[0];
      expect(sql).toContain('UPDATE employees');
      expect(values).toContain('Jane');
      expect(values).toContain(false);
      expect(values).toContain('emp-1');
      expect(result.firstName).toBe('Jane');
      expect(result.isActive).toBe(false);
    });

    it('should return existing employee when no fields are provided', async () => {
      const dto: UpdateEmployeeDto = {};

      pool.query.mockResolvedValueOnce({ rows: [mockEmployeeRow] }); // for findById

      const result = await repository.update('emp-1', dto);

      expect(pool.query).toHaveBeenCalledTimes(1); // only findById
      expect(result).toEqual(expectedEmployee);
    });

    it('should throw an error if employee does not exist', async () => {
      const dto: UpdateEmployeeDto = { firstName: 'Ghost' };

      // The update query will be executed and return no rows
      pool.query.mockResolvedValueOnce({ rows: [] });

      await expect(repository.update('ghost-id', dto)).rejects.toThrow('Employee not found');
    });
  });

  describe('delete', () => {
    it('should delete the employee by id', async () => {
      pool.query.mockResolvedValueOnce({ rowCount: 1 });

      await repository.delete('emp-1');

      expect(pool.query).toHaveBeenCalledWith('DELETE FROM employees WHERE id = $1', ['emp-1']);
    });
  });

  describe('findActiveEmployees', () => {
    it('should return all active employees ordered by last_name, first_name', async () => {
      const activeRow = { ...mockEmployeeRow, is_active: true };
      pool.query.mockResolvedValueOnce({ rows: [activeRow] });

      const result = await repository.findActiveEmployees();

      expect(pool.query).toHaveBeenCalledWith(
        'SELECT * FROM employees WHERE is_active = true ORDER BY last_name, first_name'
      );
      expect(result).toHaveLength(1);
      expect(result[0].isActive).toBe(true);
    });
  });

  describe('findSubordinates', () => {
    it('should return active subordinates for a given manager', async () => {
      const subordinateRow = { ...mockEmployeeRow, manager_id: 'mgr-1', is_active: true };
      pool.query.mockResolvedValueOnce({ rows: [subordinateRow] });

      const result = await repository.findSubordinates('mgr-1');

      expect(pool.query).toHaveBeenCalledWith(
        'SELECT * FROM employees WHERE manager_id = $1 AND is_active = true ORDER BY last_name, first_name',
        ['mgr-1']
      );
      expect(result).toHaveLength(1);
      expect(result[0].managerId).toBe('mgr-1');
    });
  });
});
