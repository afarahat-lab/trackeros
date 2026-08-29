jest.mock('../../../../src/shared/db/connection', () => ({
  pool: { query: jest.fn() }
}));

import { PgEmployeeRepository } from '../../../../src/modules/employee/employee.repository';
import {
  Employee,
  EmploymentStatus
} from '../../../../src/modules/employee/employee.model';
import { pool } from '../../../../src/shared/db/connection';

const queryMock = (pool as unknown as { query: jest.Mock }).query;

function makeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'emp-1',
    employee_number: 'E001',
    first_name: 'Ada',
    last_name: 'Lovelace',
    email: 'ada@example.com',
    manager_id: null,
    department: null,
    hire_date: new Date('2024-01-01T00:00:00Z'),
    termination_date: null,
    employment_status: 'ACTIVE' as EmploymentStatus,
    ...overrides
  };
}

function makeEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
    id: 'emp-1',
    employeeNumber: 'E001',
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.com',
    managerId: null,
    department: null,
    hireDate: new Date('2024-01-01T00:00:00Z'),
    terminationDate: null,
    employmentStatus: 'ACTIVE',
    ...overrides
  };
}

describe('PgEmployeeRepository', () => {
  let repo: PgEmployeeRepository;

  beforeEach(() => {
    queryMock.mockReset();
    repo = new PgEmployeeRepository();
  });

  describe('mapRow employmentStatus fallback', () => {
    it('preserves a recognized status', async () => {
      queryMock.mockResolvedValue({
        rows: [makeRow({ employment_status: 'TERMINATED' })]
      });

      const result = await repo.findById('emp-1');

      expect(result?.employmentStatus).toBe('TERMINATED');
    });

    it('falls back to ACTIVE for an unknown status', async () => {
      queryMock.mockResolvedValue({
        rows: [makeRow({ employment_status: 'ON_LEAVE' })]
      });

      const result = await repo.findById('emp-1');

      expect(result?.employmentStatus).toBe('ACTIVE');
    });
  });

  describe('create', () => {
    it('maps snake_case columns to the Employee contract', async () => {
      queryMock.mockResolvedValue({ rows: [makeRow()] });

      const result = await repo.create(makeEmployee());

      expect(result).toEqual({
        id: 'emp-1',
        employeeNumber: 'E001',
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@example.com',
        managerId: null,
        department: null,
        hireDate: new Date('2024-01-01T00:00:00Z'),
        terminationDate: null,
        employmentStatus: 'ACTIVE'
      });
    });

    it('uses the provided client instead of the shared pool', async () => {
      const client = { query: jest.fn().mockResolvedValue({ rows: [makeRow()] }) };
      queryMock.mockResolvedValue({ rows: [makeRow()] });

      await repo.create(makeEmployee(), client as never);

      expect(client.query).toHaveBeenCalledTimes(1);
      expect(queryMock).not.toHaveBeenCalled();
    });
  });

  describe('lookups', () => {
    it('returns null when no row is found', async () => {
      queryMock.mockResolvedValue({ rows: [] });

      await expect(repo.findByEmployeeNumber('NOPE')).resolves.toBeNull();
      await expect(repo.findByEmail('nope@example.com')).resolves.toBeNull();
      await expect(repo.findById('nope')).resolves.toBeNull();
    });

    it('returns a mapped employee for findByEmployeeNumber', async () => {
      queryMock.mockResolvedValue({ rows: [makeRow()] });

      const result = await repo.findByEmployeeNumber('E001');

      expect(result?.employeeNumber).toBe('E001');
    });

    it('maps every employee in a list', async () => {
      queryMock.mockResolvedValue({
        rows: [makeRow({ id: 'emp-1' }), makeRow({ id: 'emp-2', employee_number: 'E002' })]
      });

      const results = await repo.list();

      expect(results).toHaveLength(2);
      expect(results.map((e) => e.employeeNumber)).toEqual(['E001', 'E002']);
    });
  });
});
