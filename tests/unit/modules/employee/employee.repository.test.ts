import { PgEmployeeRepository } from '../../../../src/modules/employee/employee.repository';
import { pool } from '../../../../src/shared/db/connection';
import { Employee } from '../../../../src/modules/employee/employee.model';
import { EmploymentStatus } from '../../../../src/shared/types';

jest.mock('../../../../src/shared/db/connection', () => ({
  pool: {
    query: jest.fn(),
  },
}));

const mockQuery = pool.query as jest.Mock;

describe('PgEmployeeRepository', () => {
  let repo: PgEmployeeRepository;

  const mockRow = {
    id: '123',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john@example.com',
    employment_status: EmploymentStatus.ACTIVE,
    manager_id: '456',
    created_at: '2023-01-01T00:00:00.000Z',
    updated_at: '2023-01-02T00:00:00.000Z',
  };

  const mockEmployee: Employee = {
    id: '123',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    employmentStatus: EmploymentStatus.ACTIVE,
    managerId: '456',
    createdAt: new Date('2023-01-01T00:00:00.000Z'),
    updatedAt: new Date('2023-01-02T00:00:00.000Z'),
  };

  beforeEach(() => {
    repo = new PgEmployeeRepository();
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should return employee when found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockRow] });
      const result = await repo.findById('123');
      expect(result).toEqual(mockEmployee);
      expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM employees WHERE id = $1', ['123']);
    });

    it('should return null when not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const result = await repo.findById('nonexistent');
      expect(result).toBeNull();
    });

    it('should throw error on database failure', async () => {
      mockQuery.mockRejectedValueOnce(new Error('DB error'));
      await expect(repo.findById('123')).rejects.toThrow('Failed to find employee by id: DB error');
    });
  });

  describe('findByEmail', () => {
    it('should return employee when found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockRow] });
      const result = await repo.findByEmail('john@example.com');
      expect(result).toEqual(mockEmployee);
      expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM employees WHERE email = $1', ['john@example.com']);
    });

    it('should return null when not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const result = await repo.findByEmail('unknown@example.com');
      expect(result).toBeNull();
    });

    it('should throw error on database failure', async () => {
      mockQuery.mockRejectedValueOnce(new Error('DB error'));
      await expect(repo.findByEmail('john@example.com')).rejects.toThrow('Failed to find employee by email: DB error');
    });
  });

  describe('findAll', () => {
    it('should return all employees', async () => {
      const rows = [mockRow, { ...mockRow, id: '456', email: 'jane@example.com' }];
      mockQuery.mockResolvedValueOnce({ rows });
      const result = await repo.findAll();
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(mockEmployee);
      expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM employees');
    });

    it('should return empty array when no employees', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const result = await repo.findAll();
      expect(result).toEqual([]);
    });

    it('should throw error on database failure', async () => {
      mockQuery.mockRejectedValueOnce(new Error('DB error'));
      await expect(repo.findAll()).rejects.toThrow('Failed to find all employees: DB error');
    });
  });

  describe('create', () => {
    const newEmployeeData = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      employmentStatus: EmploymentStatus.ACTIVE,
      managerId: '456',
    };

    it('should create and return the new employee', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockRow] });
      const result = await repo.create(newEmployeeData);
      expect(result).toEqual(mockEmployee);
      expect(mockQuery).toHaveBeenCalledWith(
        `INSERT INTO employees (first_name, last_name, email, employment_status, manager_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        ['John', 'Doe', 'john@example.com', EmploymentStatus.ACTIVE, '456']
      );
    });

    it('should throw error on database failure', async () => {
      mockQuery.mockRejectedValueOnce(new Error('DB error'));
      await expect(repo.create(newEmployeeData)).rejects.toThrow('Failed to create employee: DB error');
    });
  });

  describe('update', () => {
    it('should update provided fields and return updated employee', async () => {
      const updatedRow = { ...mockRow, first_name: 'Jane' };
      mockQuery.mockResolvedValueOnce({ rows: [updatedRow] });
      const result = await repo.update('123', { firstName: 'Jane' });
      expect(result).toEqual({ ...mockEmployee, firstName: 'Jane' });
      expect(mockQuery).toHaveBeenCalledWith(
        'UPDATE employees SET first_name = $1 WHERE id = $2 RETURNING *',
        ['Jane', '123']
      );
    });

    it('should return null when employee not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const result = await repo.update('nonexistent', { firstName: 'Jane' });
      expect(result).toBeNull();
    });

    it('should return current employee when no fields provided', async () => {
      // findById will be called internally
      mockQuery.mockResolvedValueOnce({ rows: [mockRow] });
      const result = await repo.update('123', {});
      expect(result).toEqual(mockEmployee);
      // findById uses SELECT * FROM employees WHERE id = $1
      expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM employees WHERE id = $1', ['123']);
    });

    it('should throw error on database failure', async () => {
      mockQuery.mockRejectedValueOnce(new Error('DB error'));
      await expect(repo.update('123', { firstName: 'Jane' })).rejects.toThrow('Failed to update employee: DB error');
    });
  });
});
