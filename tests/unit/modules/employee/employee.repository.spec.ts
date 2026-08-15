import { EmployeeRepository, IEmployeeRepository, Employee } from '../../../../src/modules/employee';
import { EmploymentStatus } from '../../../../src/shared/types';

// Mock the shared db pool
jest.mock('../../../../src/shared/db/connection', () => ({
  pool: {},
}));

// Mock knex
const mockRaw = jest.fn();
jest.mock('knex', () => {
  return jest.fn(() => ({
    raw: mockRaw,
  }));
});

function makeEmployeeRow(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    id: 'emp-1',
    employee_number: 'EMP001',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john@example.com',
    manager_id: 'mgr-1',
    department: 'Engineering',
    hire_date: new Date('2020-01-15'),
    termination_date: null,
    employment_status: 'ACTIVE',
    created_at: new Date('2020-01-15T08:00:00Z'),
    updated_at: new Date('2020-01-15T08:00:00Z'),
    deleted_at: null,
    ...overrides,
  };
}

function expectEmployee(result: Employee | null, expected: Record<string, unknown>): void {
  expect(result).not.toBeNull();
  if (result === null) return;
  expect(result.id).toBe(expected.id);
  expect(result.employeeNumber).toBe(expected.employee_number);
  expect(result.firstName).toBe(expected.first_name);
  expect(result.lastName).toBe(expected.last_name);
  expect(result.email).toBe(expected.email);
  expect(result.managerId).toBe(expected.manager_id);
  expect(result.department).toBe(expected.department);
  expect(result.hireDate).toEqual(expected.hire_date);
  expect(result.terminationDate).toBe(expected.termination_date ?? null);
  expect(result.employmentStatus).toBe(expected.employment_status);
  expect(result.createdAt).toEqual(expected.created_at);
  expect(result.updatedAt).toEqual(expected.updated_at);
  expect(result.deletedAt).toBe(expected.deleted_at ?? null);
}

describe('EmployeeRepository', () => {
  let repo: IEmployeeRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new EmployeeRepository();
  });

  describe('findById', () => {
    it('should return an employee when found', async () => {
      const row = makeEmployeeRow();
      mockRaw.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.findById('emp-1');

      expect(mockRaw).toHaveBeenCalledWith(
        'SELECT * FROM employees WHERE id = ? AND deleted_at IS NULL',
        ['emp-1'],
      );
      expectEmployee(result, row);
    });

    it('should return null when not found', async () => {
      mockRaw.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByEmployeeNumber', () => {
    it('should return an employee when found', async () => {
      const row = makeEmployeeRow();
      mockRaw.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.findByEmployeeNumber('EMP001');

      expect(mockRaw).toHaveBeenCalledWith(
        'SELECT * FROM employees WHERE employee_number = ? AND deleted_at IS NULL',
        ['EMP001'],
      );
      expectEmployee(result, row);
    });

    it('should return null when not found', async () => {
      mockRaw.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findByEmployeeNumber('NONEXISTENT');

      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return all non-deleted employees', async () => {
      const row1 = makeEmployeeRow();
      const row2 = makeEmployeeRow({ id: 'emp-2', employee_number: 'EMP002' });
      mockRaw.mockResolvedValueOnce({ rows: [row1, row2] });

      const results = await repo.findAll();

      expect(mockRaw).toHaveBeenCalledWith(
        'SELECT * FROM employees WHERE deleted_at IS NULL',
      );
      expect(results).toHaveLength(2);
      expectEmployee(results[0], row1);
      expectEmployee(results[1], row2);
    });

    it('should return empty array when no employees', async () => {
      mockRaw.mockResolvedValueOnce({ rows: [] });

      const results = await repo.findAll();

      expect(results).toEqual([]);
    });
  });

  describe('create', () => {
    it('should insert and return a new employee', async () => {
      const input: Omit<Employee, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'> = {
        employeeNumber: 'EMP001',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        managerId: 'mgr-1',
        department: 'Engineering',
        hireDate: new Date('2020-01-15'),
        terminationDate: null,
        employmentStatus: EmploymentStatus.ACTIVE,
      };

      const row = makeEmployeeRow();
      mockRaw.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.create(input);

      expect(mockRaw).toHaveBeenCalledTimes(1);
      const [sql, params] = mockRaw.mock.calls[0];
      expect(sql).toContain('INSERT INTO employees');
      expect(params[0]).toBe('EMP001');
      expect(params[1]).toBe('John');
      expect(params[2]).toBe('Doe');
      expect(params[3]).toBe('john@example.com');
      expect(params[4]).toBe('mgr-1');
      expect(params[5]).toBe('Engineering');
      expect(params[6]).toEqual(new Date('2020-01-15'));
      expect(params[7]).toBeNull();
      expect(params[8]).toBe('ACTIVE');
      expectEmployee(result, row);
    });
  });

  describe('update', () => {
    it('should update and return the employee', async () => {
      const existingRow = makeEmployeeRow();
      mockRaw.mockResolvedValueOnce({ rows: [existingRow] }); // findById

      const updatedRow = makeEmployeeRow({ first_name: 'Jane', updated_at: new Date() });
      mockRaw.mockResolvedValueOnce({ rows: [updatedRow] }); // update

      const result = await repo.update('emp-1', { firstName: 'Jane' });

      expect(mockRaw).toHaveBeenCalledTimes(2);
      expectEmployee(result, updatedRow);
    });

    it('should return null when employee does not exist', async () => {
      mockRaw.mockResolvedValueOnce({ rows: [] }); // findById returns null

      const result = await repo.update('nonexistent', { firstName: 'Jane' });

      expect(result).toBeNull();
      expect(mockRaw).toHaveBeenCalledTimes(1);
    });

    it('should return existing employee when no fields to update', async () => {
      const existingRow = makeEmployeeRow();
      mockRaw.mockResolvedValueOnce({ rows: [existingRow] }); // findById

      const result = await repo.update('emp-1', {});

      expect(mockRaw).toHaveBeenCalledTimes(1);
      expectEmployee(result, existingRow);
    });
  });

  describe('softDelete', () => {
    it('should set deleted_at and updated_at', async () => {
      mockRaw.mockResolvedValueOnce({ rows: [] });

      await repo.softDelete('emp-1');

      expect(mockRaw).toHaveBeenCalledWith(
        'UPDATE employees SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL',
        [expect.any(Date), expect.any(Date), 'emp-1'],
      );
    });
  });
});
