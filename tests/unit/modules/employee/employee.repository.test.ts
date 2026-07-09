import { EmployeeRepository } from '../../../../src/modules/employee/employee.repository';
import { Employee } from '../../../../src/modules/employee/employee.model';
import { EmployeeStatus } from '../../../../src/shared/types/index';
import { Pool } from 'pg';

describe('EmployeeRepository', () => {
  let mockPool: jest.Mocked<Pool>;
  let repo: EmployeeRepository;

  const mockEmployee: Employee = {
    id: '1',
    employeeNumber: 'EMP001',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    managerId: 'mgr-1',
    department: 'Engineering',
    hireDate: new Date('2020-01-15'),
    terminationDate: null,
    employmentStatus: EmployeeStatus.ACTIVE,
    createdAt: new Date('2020-01-15T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };

  beforeEach(() => {
    mockPool = {
      query: jest.fn(),
    } as unknown as jest.Mocked<Pool>;

    repo = new EmployeeRepository(mockPool);
  });

  describe('findById', () => {
    it('should return employee when found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [mockEmployee] } as never);

      const result = await repo.findById('1');
      expect(result).toEqual(mockEmployee);
      expect(mockPool.query).toHaveBeenCalledWith('SELECT * FROM employees WHERE id = $1', ['1']);
    });

    it('should return null when not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] } as never);

      const result = await repo.findById('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return all employees', async () => {
      const employees = [mockEmployee];
      mockPool.query.mockResolvedValueOnce({ rows: employees } as never);

      const result = await repo.findAll();
      expect(result).toEqual(employees);
    });

    it('should return empty array when no employees', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] } as never);

      const result = await repo.findAll();
      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    it('should create and return employee', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [mockEmployee] } as never);

      const result = await repo.create({
        employeeNumber: 'EMP001',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        managerId: 'mgr-1',
        department: 'Engineering',
        hireDate: new Date('2020-01-15'),
        terminationDate: null,
        employmentStatus: EmployeeStatus.ACTIVE,
      });
      expect(result).toEqual(mockEmployee);
    });
  });

  describe('update', () => {
    it('should update and return employee', async () => {
      const updated = { ...mockEmployee, firstName: 'Jane' };
      mockPool.query.mockResolvedValueOnce({ rows: [updated] } as never);

      const result = await repo.update('1', { firstName: 'Jane' });
      expect(result).toEqual(updated);
    });
  });

  describe('delete', () => {
    it('should delete employee', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] } as never);

      await expect(repo.delete('1')).resolves.toBeUndefined();
      expect(mockPool.query).toHaveBeenCalledWith('DELETE FROM employees WHERE id = $1', ['1']);
    });
  });

  describe('findByEmployeeNumber', () => {
    it('should return employee when found by employee number', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [mockEmployee] } as never);

      const result = await repo.findByEmployeeNumber('EMP001');
      expect(result).toEqual(mockEmployee);
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM employees WHERE employee_number = $1',
        ['EMP001']
      );
    });

    it('should return null when employee number not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] } as never);

      const result = await repo.findByEmployeeNumber('NONEXISTENT');
      expect(result).toBeNull();
    });
  });

  describe('findByManagerId', () => {
    it('should return employees for a given manager', async () => {
      const employees = [mockEmployee];
      mockPool.query.mockResolvedValueOnce({ rows: employees } as never);

      const result = await repo.findByManagerId('mgr-1');
      expect(result).toEqual(employees);
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM employees WHERE manager_id = $1',
        ['mgr-1']
      );
    });

    it('should return empty array when manager has no direct reports', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] } as never);

      const result = await repo.findByManagerId('mgr-empty');
      expect(result).toEqual([]);
    });
  });

  describe('findByDepartment', () => {
    it('should return employees in a department', async () => {
      const employees = [mockEmployee];
      mockPool.query.mockResolvedValueOnce({ rows: employees } as never);

      const result = await repo.findByDepartment('Engineering');
      expect(result).toEqual(employees);
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM employees WHERE department = $1',
        ['Engineering']
      );
    });

    it('should return empty array when department has no employees', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] } as never);

      const result = await repo.findByDepartment('EmptyDept');
      expect(result).toEqual([]);
    });
  });
});
