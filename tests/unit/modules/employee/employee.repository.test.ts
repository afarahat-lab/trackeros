import { Pool } from 'pg';
import { PgEmployeeRepository } from 'modules/employee/employee.repository';
import { EmploymentStatus } from 'shared/types';

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

const mockQuery = (jest.requireMock('pg') as { __mockQuery: jest.Mock }).__mockQuery;

function makeMockRow(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    id: 'emp-1',
    employee_number: 'EMP001',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john.doe@example.com',
    manager_id: null,
    department: 'Engineering',
    hire_date: '2023-01-15T00:00:00.000Z',
    termination_date: null,
    employment_status: 'ACTIVE',
    created_at: '2023-01-15T00:00:00.000Z',
    updated_at: '2023-06-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeExpectedEmployee(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    id: 'emp-1',
    employeeNumber: 'EMP001',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    managerId: null,
    department: 'Engineering',
    hireDate: new Date('2023-01-15T00:00:00.000Z'),
    terminationDate: null,
    employmentStatus: EmploymentStatus.ACTIVE,
    createdAt: new Date('2023-01-15T00:00:00.000Z'),
    updatedAt: new Date('2023-06-01T00:00:00.000Z'),
    ...overrides,
  };
}

describe('PgEmployeeRepository', () => {
  let repository: PgEmployeeRepository;

  beforeEach(() => {
    mockQuery.mockReset();
    const pool = new Pool();
    repository = new PgEmployeeRepository(pool);
  });

  describe('findById', () => {
    it('should return an employee when found', async () => {
      const row = makeMockRow();
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repository.findById('emp-1');

      expect(result).toEqual(makeExpectedEmployee());
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        ['emp-1']
      );
    });

    it('should return null when not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
    });

    it('should throw an error on database failure', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Connection refused'));

      await expect(repository.findById('emp-1')).rejects.toThrow(
        'PgEmployeeRepository.findById failed: Connection refused'
      );
    });
  });

  describe('findByEmail', () => {
    it('should return an employee when found', async () => {
      const row = makeMockRow({ email: 'john.doe@example.com' });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repository.findByEmail('john.doe@example.com');

      expect(result).toEqual(makeExpectedEmployee({ email: 'john.doe@example.com' }));
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        ['john.doe@example.com']
      );
    });

    it('should return null when not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repository.findByEmail('unknown@example.com');

      expect(result).toBeNull();
    });

    it('should throw an error on database failure', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Connection refused'));

      await expect(repository.findByEmail('john.doe@example.com')).rejects.toThrow(
        'PgEmployeeRepository.findByEmail failed: Connection refused'
      );
    });
  });

  describe('findAll', () => {
    it('should return all employees', async () => {
      const row1 = makeMockRow();
      const row2 = makeMockRow({
        id: 'emp-2',
        employee_number: 'EMP002',
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'jane.smith@example.com',
      });
      mockQuery.mockResolvedValueOnce({ rows: [row1, row2] });

      const result = await repository.findAll();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(makeExpectedEmployee());
      expect(result[1]).toEqual(
        makeExpectedEmployee({
          id: 'emp-2',
          employeeNumber: 'EMP002',
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane.smith@example.com',
        })
      );
    });

    it('should return an empty array when no employees exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repository.findAll();

      expect(result).toEqual([]);
    });

    it('should throw an error on database failure', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Connection refused'));

      await expect(repository.findAll()).rejects.toThrow(
        'PgEmployeeRepository.findAll failed: Connection refused'
      );
    });
  });

  describe('create', () => {
    const createInput = {
      employeeNumber: 'EMP003',
      firstName: 'Alice',
      lastName: 'Johnson',
      email: 'alice.johnson@example.com',
      managerId: 'emp-1',
      department: 'Marketing',
      hireDate: new Date('2024-01-10T00:00:00.000Z'),
      terminationDate: null,
      employmentStatus: EmploymentStatus.ACTIVE,
    };

    it('should create and return a new employee', async () => {
      const row = makeMockRow({
        id: 'emp-3',
        employee_number: 'EMP003',
        first_name: 'Alice',
        last_name: 'Johnson',
        email: 'alice.johnson@example.com',
        manager_id: 'emp-1',
        department: 'Marketing',
        hire_date: '2024-01-10T00:00:00.000Z',
        termination_date: null,
        employment_status: 'ACTIVE',
        created_at: '2024-01-10T00:00:00.000Z',
        updated_at: '2024-01-10T00:00:00.000Z',
      });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repository.create(createInput);

      expect(result).toEqual(
        makeExpectedEmployee({
          id: 'emp-3',
          employeeNumber: 'EMP003',
          firstName: 'Alice',
          lastName: 'Johnson',
          email: 'alice.johnson@example.com',
          managerId: 'emp-1',
          department: 'Marketing',
          hireDate: new Date('2024-01-10T00:00:00.000Z'),
          terminationDate: null,
          employmentStatus: EmploymentStatus.ACTIVE,
          createdAt: new Date('2024-01-10T00:00:00.000Z'),
          updatedAt: new Date('2024-01-10T00:00:00.000Z'),
        })
      );
    });

    it('should throw an error on duplicate key violation', async () => {
      mockQuery.mockRejectedValueOnce(
        new Error('duplicate key value violates unique constraint')
      );

      await expect(repository.create(createInput)).rejects.toThrow(
        'PgEmployeeRepository.create failed: duplicate key value violates unique constraint'
      );
    });

    it('should throw an error on database failure', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Connection refused'));

      await expect(repository.create(createInput)).rejects.toThrow(
        'PgEmployeeRepository.create failed: Connection refused'
      );
    });
  });

  describe('update', () => {
    it('should update and return the employee when found', async () => {
      const row = makeMockRow({
        first_name: 'Updated',
        last_name: 'Name',
        updated_at: '2024-02-01T00:00:00.000Z',
      });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repository.update('emp-1', {
        firstName: 'Updated',
        lastName: 'Name',
      });

      expect(result).toEqual(
        makeExpectedEmployee({
          firstName: 'Updated',
          lastName: 'Name',
          updatedAt: new Date('2024-02-01T00:00:00.000Z'),
        })
      );
    });

    it('should return null when employee not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repository.update('nonexistent', {
        firstName: 'Updated',
      });

      expect(result).toBeNull();
    });

    it('should return current row when no updatable fields provided', async () => {
      const row = makeMockRow();
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repository.update('emp-1', {});

      expect(result).toEqual(makeExpectedEmployee());
      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        ['emp-1']
      );
    });

    it('should throw an error on database failure', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Connection refused'));

      await expect(
        repository.update('emp-1', { firstName: 'Updated' })
      ).rejects.toThrow(
        'PgEmployeeRepository.update failed: Connection refused'
      );
    });
  });

  describe('mapRowToEmployee validation', () => {
    it('should throw on invalid employment_status from database', async () => {
      const row = makeMockRow({ employment_status: 'INVALID_STATUS' });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      await expect(repository.findById('emp-1')).rejects.toThrow(
        'Invalid employment_status value from database: INVALID_STATUS'
      );
    });
  });
});
