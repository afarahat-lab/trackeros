import { IEmployeeRepository, KnexEmployeeRepository, RepositoryError } from '../../../../src/modules/employee/employee.repository';
import { Employee } from '../../../../src/modules/employee/employee.model';
import { EmployeeStatus } from '../../../../src/shared/types/leave.types';
import { Knex } from 'knex';

interface TestRow {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  managerId: string | null;
  department: string;
  designation: string;
  dateOfJoining: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

const now = new Date('2026-07-27T00:00:00.000Z');
const nowStr = now.toISOString();

function makeRow(overrides: Partial<TestRow> = {}): TestRow {
  return {
    id: 'emp-001',
    userId: 'usr-001',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    role: 'ENGINEER',
    managerId: 'emp-002',
    department: 'Engineering',
    designation: 'Senior Software Engineer',
    dateOfJoining: '2024-01-15',
    status: 'ACTIVE',
    createdAt: nowStr,
    updatedAt: nowStr,
    ...overrides,
  };
}

function makeEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
    id: 'emp-001',
    userId: 'usr-001',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    role: 'ENGINEER',
    managerId: 'emp-002',
    department: 'Engineering',
    designation: 'Senior Software Engineer',
    dateOfJoining: new Date('2024-01-15'),
    status: EmployeeStatus.ACTIVE,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('IEmployeeRepository', () => {
  it('should extend IBaseRepository<Employee> with additional methods', () => {
    class TestEmployeeRepo implements IEmployeeRepository {
      async findById(_id: string): Promise<Employee | null> { return null; }
      async findAll(): Promise<Employee[]> { return []; }
      async findByUserId(_userId: string): Promise<Employee | null> { return null; }
      async findByEmail(_email: string): Promise<Employee | null> { return null; }
      async findByManagerId(_managerId: string): Promise<Employee[]> { return []; }
      async findByDepartment(_department: string): Promise<Employee[]> { return []; }
      async findByStatus(_status: string): Promise<Employee[]> { return []; }
      async create(_entity: Omit<Employee, 'id'>): Promise<Employee> {
        return makeEmployee();
      }
      async update(_id: string, _entity: Partial<Employee>): Promise<Employee | null> { return null; }
      async delete(_id: string): Promise<boolean> { return true; }
    }

    const repo = new TestEmployeeRepo();
    expect(repo).toBeDefined();
    expect(typeof repo.findById).toBe('function');
    expect(typeof repo.findAll).toBe('function');
    expect(typeof repo.findByUserId).toBe('function');
    expect(typeof repo.findByEmail).toBe('function');
    expect(typeof repo.findByManagerId).toBe('function');
    expect(typeof repo.findByDepartment).toBe('function');
    expect(typeof repo.findByStatus).toBe('function');
    expect(typeof repo.create).toBe('function');
    expect(typeof repo.update).toBe('function');
    expect(typeof repo.delete).toBe('function');
  });
});

describe('KnexEmployeeRepository', () => {
  let repo: KnexEmployeeRepository;
  let mockKnex: jest.Mocked<Knex>;
  let mockQb: jest.Mocked<Knex.QueryBuilder>;

  beforeEach(() => {
    mockQb = {
      where: jest.fn().mockReturnThis(),
      first: jest.fn(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      returning: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
    } as unknown as jest.Mocked<Knex.QueryBuilder>;

    mockKnex = jest.fn(() => mockQb) as unknown as jest.Mocked<Knex>;
    (mockKnex as unknown as Record<string, unknown>).QueryBuilder = {};
    (mockKnex as unknown as Record<string, unknown>).client = { config: { client: 'pg' } };

    repo = new KnexEmployeeRepository(mockKnex);
  });

  describe('findById', () => {
    it('should return an Employee when found', async () => {
      const row = makeRow();
      mockQb.first = jest.fn().mockResolvedValue(row);

      const result = await repo.findById('emp-001');

      expect(mockKnex).toHaveBeenCalledWith('employees');
      expect(mockQb.where).toHaveBeenCalledWith({ id: 'emp-001' });
      expect(result).not.toBeNull();
      expect(result!.id).toBe('emp-001');
      expect(result!.userId).toBe('usr-001');
      expect(result!.firstName).toBe('John');
      expect(result!.lastName).toBe('Doe');
      expect(result!.email).toBe('john.doe@example.com');
      expect(result!.role).toBe('ENGINEER');
      expect(result!.managerId).toBe('emp-002');
      expect(result!.department).toBe('Engineering');
      expect(result!.designation).toBe('Senior Software Engineer');
      expect(result!.dateOfJoining).toEqual(new Date('2024-01-15'));
      expect(result!.status).toBe(EmployeeStatus.ACTIVE);
    });

    it('should return null when not found', async () => {
      mockQb.first = jest.fn().mockResolvedValue(null);

      const result = await repo.findById('nonexistent');

      expect(result).toBeNull();
    });

    it('should throw RepositoryError when the query rejects', async () => {
      const dbError = new Error('connection refused');
      mockQb.first = jest.fn().mockRejectedValue(dbError);

      await expect(repo.findById('emp-001')).rejects.toThrow(RepositoryError);
    });
  });

  describe('findAll', () => {
    it('should return all employees', async () => {
      const rows = [makeRow(), makeRow({ id: 'emp-002', userId: 'usr-002', email: 'jane@example.com' })];
      mockQb.select = jest.fn().mockResolvedValue(rows);

      const result = await repo.findAll();

      expect(mockQb.select).toHaveBeenCalledWith('*');
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('emp-001');
      expect(result[1].id).toBe('emp-002');
    });

    it('should return empty array when no records', async () => {
      mockQb.select = jest.fn().mockResolvedValue([]);

      const result = await repo.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findByUserId', () => {
    it('should return an Employee when found by userId', async () => {
      const row = makeRow();
      mockQb.first = jest.fn().mockResolvedValue(row);

      const result = await repo.findByUserId('usr-001');

      expect(mockQb.where).toHaveBeenCalledWith({ userId: 'usr-001' });
      expect(result).not.toBeNull();
      expect(result!.userId).toBe('usr-001');
    });

    it('should return null when userId not found', async () => {
      mockQb.first = jest.fn().mockResolvedValue(null);

      const result = await repo.findByUserId('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should return an Employee when found by email', async () => {
      const row = makeRow();
      mockQb.first = jest.fn().mockResolvedValue(row);

      const result = await repo.findByEmail('john.doe@example.com');

      expect(mockQb.where).toHaveBeenCalledWith({ email: 'john.doe@example.com' });
      expect(result).not.toBeNull();
      expect(result!.email).toBe('john.doe@example.com');
    });

    it('should return null when email not found', async () => {
      mockQb.first = jest.fn().mockResolvedValue(null);

      const result = await repo.findByEmail('unknown@example.com');

      expect(result).toBeNull();
    });
  });

  describe('findByManagerId', () => {
    it('should return employees for a given manager', async () => {
      const rows = [makeRow(), makeRow({ id: 'emp-003' })];
      mockQb.select = jest.fn().mockResolvedValue(rows);

      const result = await repo.findByManagerId('emp-002');

      expect(mockQb.where).toHaveBeenCalledWith({ managerId: 'emp-002' });
      expect(result).toHaveLength(2);
    });

    it('should return empty array when manager has no reports', async () => {
      mockQb.select = jest.fn().mockResolvedValue([]);

      const result = await repo.findByManagerId('emp-999');

      expect(result).toEqual([]);
    });
  });

  describe('findByDepartment', () => {
    it('should return employees in a given department', async () => {
      const rows = [makeRow(), makeRow({ id: 'emp-004' })];
      mockQb.select = jest.fn().mockResolvedValue(rows);

      const result = await repo.findByDepartment('Engineering');

      expect(mockQb.where).toHaveBeenCalledWith({ department: 'Engineering' });
      expect(result).toHaveLength(2);
    });
  });

  describe('findByStatus', () => {
    it('should return employees with a given status', async () => {
      const rows = [makeRow({ status: 'ON_LEAVE' })];
      mockQb.select = jest.fn().mockResolvedValue(rows);

      const result = await repo.findByStatus('ON_LEAVE');

      expect(mockQb.where).toHaveBeenCalledWith({ status: 'ON_LEAVE' });
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe(EmployeeStatus.ON_LEAVE);
    });
  });

  describe('create', () => {
    it('should insert and return a new Employee', async () => {
      const row = makeRow();
      mockQb.returning = jest.fn().mockResolvedValue([row]);

      const input: Omit<Employee, 'id'> = {
        userId: 'usr-001',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        role: 'ENGINEER',
        managerId: 'emp-002',
        department: 'Engineering',
        designation: 'Senior Software Engineer',
        dateOfJoining: new Date('2024-01-15'),
        status: EmployeeStatus.ACTIVE,
        createdAt: now,
        updatedAt: now,
      };

      const result = await repo.create(input);

      expect(mockQb.insert).toHaveBeenCalledWith(input);
      expect(result.id).toBe('emp-001');
    });
  });

  describe('update', () => {
    it('should update and return the updated Employee', async () => {
      const row = makeRow({ status: 'ON_LEAVE', updatedAt: nowStr });
      mockQb.returning = jest.fn().mockResolvedValue([row]);

      const result = await repo.update('emp-001', { status: EmployeeStatus.ON_LEAVE });

      expect(mockQb.where).toHaveBeenCalledWith({ id: 'emp-001' });
      expect(result).not.toBeNull();
      expect(result!.status).toBe(EmployeeStatus.ON_LEAVE);
    });

    it('should return null when updating nonexistent record', async () => {
      mockQb.returning = jest.fn().mockResolvedValue([]);

      const result = await repo.update('nonexistent', { department: 'HR' });

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should return true when a record is deleted', async () => {
      mockQb.delete = jest.fn().mockResolvedValue(1);

      const result = await repo.delete('emp-001');

      expect(mockQb.where).toHaveBeenCalledWith({ id: 'emp-001' });
      expect(result).toBe(true);
    });

    it('should return false when no record is deleted', async () => {
      mockQb.delete = jest.fn().mockResolvedValue(0);

      const result = await repo.delete('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('toEmployee (via findById)', () => {
    it('should handle null managerId', async () => {
      const row = makeRow({ managerId: null });
      mockQb.first = jest.fn().mockResolvedValue(row);

      const result = await repo.findById('emp-001');

      expect(result!.managerId).toBeNull();
    });

    it('should parse date fields correctly', async () => {
      const row = makeRow({
        dateOfJoining: '2023-03-15',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-06-15T12:00:00.000Z',
      });
      mockQb.first = jest.fn().mockResolvedValue(row);

      const result = await repo.findById('emp-001');

      expect(result!.dateOfJoining).toEqual(new Date('2023-03-15'));
      expect(result!.createdAt).toEqual(new Date('2025-01-01T00:00:00.000Z'));
      expect(result!.updatedAt).toEqual(new Date('2025-06-15T12:00:00.000Z'));
    });
  });
});
