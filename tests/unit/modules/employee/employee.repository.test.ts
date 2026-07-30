import { Pool } from 'pg';
import { PgEmployeeRepository } from '../../../../src/modules/employee/employee.repository';
import { EmploymentStatus } from '../../../../src/shared/types/index';
import { Employee } from '../../../../src/modules/employee/employee.model';

jest.mock('pg', () => {
  const mockQuery = jest.fn();
  const mockPool = {
    query: mockQuery,
  };
  return {
    Pool: jest.fn(() => mockPool),
    __mockQuery: mockQuery,
  };
});

const { __mockQuery } = jest.requireMock('pg') as { __mockQuery: jest.Mock };

describe('PgEmployeeRepository', () => {
  let repository: PgEmployeeRepository;
  let mockQuery: jest.Mock;

  const mockRow = {
    id: 'emp-1',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john.doe@example.com',
    employment_status: 'ACTIVE',
    manager_id: null,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-02T00:00:00.000Z',
  };

  const mockEmployee: Employee = {
    id: 'emp-1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    employmentStatus: EmploymentStatus.ACTIVE,
    managerId: null,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-02T00:00:00.000Z'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery = __mockQuery;
    repository = new PgEmployeeRepository(new Pool());
  });

  describe('findById', () => {
    it('should return an employee when found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockRow] });

      const result = await repository.findById('emp-1');

      expect(result).toEqual(mockEmployee);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT id, first_name, last_name, email, employment_status, manager_id, created_at, updated_at FROM employees WHERE id = $1',
        ['emp-1']
      );
    });

    it('should return null when employee not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
    });

    it('should throw an error on database failure', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Connection refused'));

      await expect(repository.findById('emp-1')).rejects.toThrow(
        'Failed to find employee by id: Connection refused'
      );
    });
  });

  describe('findByEmail', () => {
    it('should return an employee when found by email', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockRow] });

      const result = await repository.findByEmail('john.doe@example.com');

      expect(result).toEqual(mockEmployee);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT id, first_name, last_name, email, employment_status, manager_id, created_at, updated_at FROM employees WHERE email = $1',
        ['john.doe@example.com']
      );
    });

    it('should return null when email not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repository.findByEmail('unknown@example.com');

      expect(result).toBeNull();
    });

    it('should throw an error on database failure', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Connection refused'));

      await expect(repository.findByEmail('john.doe@example.com')).rejects.toThrow(
        'Failed to find employee by email: Connection refused'
      );
    });
  });

  describe('findAll', () => {
    it('should return all employees', async () => {
      const row2 = { ...mockRow, id: 'emp-2', first_name: 'Jane' };
      mockQuery.mockResolvedValueOnce({ rows: [mockRow, row2] });

      const result = await repository.findAll();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(mockEmployee);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT id, first_name, last_name, email, employment_status, manager_id, created_at, updated_at FROM employees ORDER BY last_name, first_name'
      );
    });

    it('should return empty array when no employees exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repository.findAll();

      expect(result).toEqual([]);
    });

    it('should throw an error on database failure', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Connection refused'));

      await expect(repository.findAll()).rejects.toThrow(
        'Failed to find all employees: Connection refused'
      );
    });
  });

  describe('create', () => {
    const createInput = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      employmentStatus: EmploymentStatus.ACTIVE,
      managerId: null,
    };

    it('should create and return a new employee', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockRow] });

      const result = await repository.create(createInput);

      expect(result).toEqual(mockEmployee);
      expect(mockQuery).toHaveBeenCalledWith(
        `INSERT INTO employees (first_name, last_name, email, employment_status, manager_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, first_name, last_name, email, employment_status, manager_id, created_at, updated_at`,
        ['John', 'Doe', 'john.doe@example.com', 'ACTIVE', null]
      );
    });

    it('should throw an error on unique constraint violation', async () => {
      mockQuery.mockRejectedValueOnce(new Error('duplicate key value violates unique constraint'));

      await expect(repository.create(createInput)).rejects.toThrow(
        'Failed to create employee: duplicate key value violates unique constraint'
      );
    });
  });

  describe('update', () => {
    it('should update and return the employee', async () => {
      const updatedRow = { ...mockRow, first_name: 'Jane', updated_at: '2024-01-03T00:00:00.000Z' };
      mockQuery.mockResolvedValueOnce({ rows: [updatedRow] });

      const result = await repository.update('emp-1', { firstName: 'Jane' });

      expect(result).toEqual({
        ...mockEmployee,
        firstName: 'Jane',
        updatedAt: new Date('2024-01-03T00:00:00.000Z'),
      });
    });

    it('should return null when employee does not exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repository.update('nonexistent', { firstName: 'Jane' });

      expect(result).toBeNull();
    });

    it('should return current row when empty partial is provided', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockRow] });

      const result = await repository.update('emp-1', {});

      expect(result).toEqual(mockEmployee);
      // Should call findById when no fields to update
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT id, first_name, last_name, email, employment_status, manager_id, created_at, updated_at FROM employees WHERE id = $1',
        ['emp-1']
      );
    });

    it('should throw an error on database failure', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Connection refused'));

      await expect(repository.update('emp-1', { firstName: 'Jane' })).rejects.toThrow(
        'Failed to update employee: Connection refused'
      );
    });
  });

  describe('mapRowToEmployee', () => {
    it('should throw an error for invalid employment status', async () => {
      const invalidRow = { ...mockRow, employment_status: 'INVALID_STATUS' };
      mockQuery.mockResolvedValueOnce({ rows: [invalidRow] });

      await expect(repository.findById('emp-1')).rejects.toThrow(
        'Invalid employment status from database: INVALID_STATUS'
      );
    });
  });
});
