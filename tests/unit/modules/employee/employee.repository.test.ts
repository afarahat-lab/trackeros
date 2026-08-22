import { QueryResult } from 'pg';
import { pool } from '../../../../src/shared/db/connection';
import { EmployeeRepository } from '../../../../src/modules/employee/employee.repository';
import { Employee } from '../../../../src/modules/employee/employee.model';

jest.mock('../../../../src/shared/db/connection', () => ({
  pool: {
    query: jest.fn(),
  },
}));

const mockQuery = pool.query as jest.Mock;

function makeEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
    id: 'emp-1',
    fullName: 'Alice Johnson',
    email: 'alice@example.com',
    department: 'Engineering',
    managerId: 'mgr-1',
    createdAt: new Date('2024-01-15T00:00:00.000Z'),
    updatedAt: new Date('2024-06-01T00:00:00.000Z'),
    ...overrides,
  };
}

function makeQueryResult<T extends Record<string, unknown>>(rows: T[]): QueryResult<T> {
  return {
    rows,
    rowCount: rows.length,
    command: '',
    oid: 0,
    fields: [],
  };
}

describe('EmployeeRepository', () => {
  let repo: EmployeeRepository;

  beforeEach(() => {
    mockQuery.mockReset();
    repo = new EmployeeRepository();
  });

  describe('findById', () => {
    it('returns an Employee when the row exists', async () => {
      const employee = makeEmployee();
      mockQuery.mockResolvedValueOnce(makeQueryResult([employee]));

      const result = await repo.findById('emp-1');

      expect(result).toEqual(employee);
      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('SELECT'), ['emp-1']);
    });

    it('returns null when no row matches', async () => {
      mockQuery.mockResolvedValueOnce(makeQueryResult([]));

      const result = await repo.findById('nonexistent');

      expect(result).toBeNull();
    });

    it('propagates database errors as rejected promises', async () => {
      const dbError = new Error('connection refused');
      mockQuery.mockRejectedValueOnce(dbError);

      await expect(repo.findById('emp-1')).rejects.toThrow('connection refused');
    });
  });

  describe('findByEmail', () => {
    it('returns an Employee when the row exists', async () => {
      const employee = makeEmployee({ email: 'bob@example.com' });
      mockQuery.mockResolvedValueOnce(makeQueryResult([employee]));

      const result = await repo.findByEmail('bob@example.com');

      expect(result).toEqual(employee);
      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('SELECT'), ['bob@example.com']);
    });

    it('returns null when no row matches', async () => {
      mockQuery.mockResolvedValueOnce(makeQueryResult([]));

      const result = await repo.findByEmail('nobody@example.com');

      expect(result).toBeNull();
    });

    it('propagates database errors as rejected promises', async () => {
      const dbError = new Error('connection refused');
      mockQuery.mockRejectedValueOnce(dbError);

      await expect(repo.findByEmail('alice@example.com')).rejects.toThrow('connection refused');
    });
  });

  describe('findByDepartment', () => {
    it('returns an array of Employees for a matching department', async () => {
      const employees = [
        makeEmployee({ id: 'emp-1', fullName: 'Alice' }),
        makeEmployee({ id: 'emp-2', fullName: 'Bob' }),
      ];
      mockQuery.mockResolvedValueOnce(makeQueryResult(employees));

      const result = await repo.findByDepartment('Engineering');

      expect(result).toHaveLength(2);
      expect(result).toEqual(employees);
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('SELECT'), ['Engineering']);
    });

    it('returns an empty array when no employees are in the department', async () => {
      mockQuery.mockResolvedValueOnce(makeQueryResult([]));

      const result = await repo.findByDepartment('EmptyDept');

      expect(result).toEqual([]);
      expect(result).not.toBeNull();
    });

    it('propagates database errors as rejected promises', async () => {
      const dbError = new Error('connection refused');
      mockQuery.mockRejectedValueOnce(dbError);

      await expect(repo.findByDepartment('Engineering')).rejects.toThrow('connection refused');
    });
  });
});
