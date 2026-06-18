import { PostgresEmployeeRepository } from '../../../../src/modules/employee/employee.repository';
import { Employee, CreateEmployeeDto } from '../../../../src/modules/employee/employee.model';
import { Pool } from 'pg';

jest.mock('pg', () => {
  const mPool = {
    query: jest.fn(),
    connect: jest.fn(),
  };
  return { Pool: jest.fn(() => mPool) };
});

describe('PostgresEmployeeRepository', () => {
  let pool: any;
  let repository: PostgresEmployeeRepository;

  beforeEach(() => {
    pool = new Pool();
    repository = new PostgresEmployeeRepository(pool);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockRow = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    employee_number: 'E001',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john.doe@example.com',
    manager_id: null,
    department: 'Engineering',
    hire_date: new Date('2020-01-15'),
    is_active: true,
    created_at: new Date('2020-01-15T08:00:00Z'),
    updated_at: new Date('2020-01-15T08:00:00Z'),
  };

  const expectedEmployee: Employee = {
    id: mockRow.id,
    employeeNumber: mockRow.employee_number,
    firstName: mockRow.first_name,
    lastName: mockRow.last_name,
    email: mockRow.email,
    managerId: mockRow.manager_id,
    department: mockRow.department,
    hireDate: mockRow.hire_date,
    isActive: mockRow.is_active,
    createdAt: mockRow.created_at,
    updatedAt: mockRow.updated_at,
  };

  describe('findById', () => {
    it('should return an employee when found', async () => {
      pool.query.mockResolvedValueOnce({ rows: [mockRow] });
      const result = await repository.findById(mockRow.id);
      expect(result).toEqual(expectedEmployee);
      expect(pool.query).toHaveBeenCalledWith(expect.any(String), [mockRow.id]);
    });

    it('should return null when not found', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });
      const result = await repository.findById('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should return an employee when found', async () => {
      pool.query.mockResolvedValueOnce({ rows: [mockRow] });
      const result = await repository.findByEmail(mockRow.email);
      expect(result).toEqual(expectedEmployee);
      expect(pool.query).toHaveBeenCalledWith(expect.any(String), [mockRow.email]);
    });

    it('should return null when not found', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });
      const result = await repository.findByEmail('unknown@example.com');
      expect(result).toBeNull();
    });
  });

  describe('findByManagerId', () => {
    it('should return employees for a given manager', async () => {
      const managerId = '11111111-1111-1111-1111-111111111111';
      const rows = [
        { ...mockRow, manager_id: managerId },
        { ...mockRow, id: '22222222-2222-2222-2222-222222222222', manager_id: managerId },
      ];
      pool.query.mockResolvedValueOnce({ rows });
      const result = await repository.findByManagerId(managerId);
      expect(result).toHaveLength(2);
      expect(result[0].managerId).toBe(managerId);
      expect(pool.query).toHaveBeenCalledWith(expect.any(String), [managerId]);
    });

    it('should return empty array when no employees found', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });
      const result = await repository.findByManagerId('nonexistent');
      expect(result).toEqual([]);
    });
  });

  describe('save', () => {
    const createDto: CreateEmployeeDto = {
      employeeNumber: 'E002',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@example.com',
      managerId: null,
      department: 'HR',
      hireDate: new Date('2021-06-01'),
      isActive: true,
    };

    it('should insert a new employee and return it', async () => {
      const client = {
        query: jest.fn(),
        release: jest.fn(),
      };
      pool.connect.mockResolvedValueOnce(client);

      const insertedRow = {
        id: '33333333-3333-3333-3333-333333333333',
        employee_number: createDto.employeeNumber,
        first_name: createDto.firstName,
        last_name: createDto.lastName,
        email: createDto.email,
        manager_id: null,
        department: createDto.department,
        hire_date: createDto.hireDate,
        is_active: true,
        created_at: new Date('2021-06-01T08:00:00Z'),
        updated_at: new Date('2021-06-01T08:00:00Z'),
      };

      client.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [insertedRow] }) // INSERT
        .mockResolvedValueOnce(undefined) // audit log
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await repository.save(createDto);

      expect(client.query).toHaveBeenCalledWith('BEGIN');
      expect(client.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO employees'), expect.any(Array));
      expect(client.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO audit_log'), expect.any(Array));
      expect(client.query).toHaveBeenCalledWith('COMMIT');
      expect(client.release).toHaveBeenCalled();

      expect(result).toEqual({
        id: insertedRow.id,
        employeeNumber: insertedRow.employee_number,
        firstName: insertedRow.first_name,
        lastName: insertedRow.last_name,
        email: insertedRow.email,
        managerId: insertedRow.manager_id,
        department: insertedRow.department,
        hireDate: insertedRow.hire_date,
        isActive: insertedRow.is_active,
        createdAt: insertedRow.created_at,
        updatedAt: insertedRow.updated_at,
      });
    });

    it('should rollback on error', async () => {
      const client = {
        query: jest.fn(),
        release: jest.fn(),
      };
      pool.connect.mockResolvedValueOnce(client);
      client.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockRejectedValueOnce(new Error('DB error')); // INSERT fails

      await expect(repository.save(createDto)).rejects.toThrow('DB error');
      expect(client.query).toHaveBeenCalledWith('ROLLBACK');
      expect(client.release).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    const existingEmployee: Employee = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      employeeNumber: 'E001',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      managerId: null,
      department: 'Engineering',
      hireDate: new Date('2020-01-15'),
      isActive: true,
      createdAt: new Date('2020-01-15T08:00:00Z'),
      updatedAt: new Date('2020-01-15T08:00:00Z'),
    };

    it('should update an employee and return it', async () => {
      const client = {
        query: jest.fn(),
        release: jest.fn(),
      };
      pool.connect.mockResolvedValueOnce(client);

      const updatedRow = {
        ...mockRow,
        department: 'Product',
        updated_at: new Date('2022-01-01T08:00:00Z'),
      };

      client.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [updatedRow] }) // UPDATE
        .mockResolvedValueOnce(undefined) // audit log
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await repository.update(existingEmployee);

      expect(client.query).toHaveBeenCalledWith('BEGIN');
      expect(client.query).toHaveBeenCalledWith(expect.stringContaining('UPDATE employees'), expect.any(Array));
      expect(client.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO audit_log'), expect.any(Array));
      expect(client.query).toHaveBeenCalledWith('COMMIT');
      expect(client.release).toHaveBeenCalled();

      expect(result).toEqual({
        id: updatedRow.id,
        employeeNumber: updatedRow.employee_number,
        firstName: updatedRow.first_name,
        lastName: updatedRow.last_name,
        email: updatedRow.email,
        managerId: updatedRow.manager_id,
        department: updatedRow.department,
        hireDate: updatedRow.hire_date,
        isActive: updatedRow.is_active,
        createdAt: updatedRow.created_at,
        updatedAt: updatedRow.updated_at,
      });
    });

    it('should throw if employee not found', async () => {
      const client = {
        query: jest.fn(),
        release: jest.fn(),
      };
      pool.connect.mockResolvedValueOnce(client);
      client.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [] }); // UPDATE returns nothing

      await expect(repository.update(existingEmployee)).rejects.toThrow(
        `Employee with id ${existingEmployee.id} not found`
      );
      expect(client.query).toHaveBeenCalledWith('ROLLBACK');
      expect(client.release).toHaveBeenCalled();
    });

    it('should rollback on error', async () => {
      const client = {
        query: jest.fn(),
        release: jest.fn(),
      };
      pool.connect.mockResolvedValueOnce(client);
      client.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockRejectedValueOnce(new Error('DB error')); // UPDATE fails

      await expect(repository.update(existingEmployee)).rejects.toThrow('DB error');
      expect(client.query).toHaveBeenCalledWith('ROLLBACK');
      expect(client.release).toHaveBeenCalled();
    });
  });
});
