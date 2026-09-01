import { EmploymentStatus } from '../../../../src/shared/types';
import { EmployeeRepository } from '../../../../src/modules/employee/employee.repository';
import { EmployeeNotFoundError, UniqueConstraintError } from '../../../../src/modules/employee/employee.errors';
import type { CreateEmployeeInput } from '../../../../src/modules/employee/employee.model';

const poolQuery = jest.fn();

jest.mock('../../../../src/shared/db', () => ({
  pool: { query: (...args: unknown[]) => poolQuery(...args) },
}));

interface Row {
  [key: string]: unknown;
}

interface FakeQueryResult {
  rows: Row[];
}

interface FakeClient {
  query: jest.Mock<Promise<FakeQueryResult>, [string, unknown[]]>;
}

describe('EmployeeRepository', () => {
  const now = new Date('2026-03-01T12:00:00.000Z');

  let repo: EmployeeRepository;

  beforeEach(() => {
    poolQuery.mockReset();
    repo = new EmployeeRepository();
  });

  function mockReturn(rows: Row[]): void {
    poolQuery.mockResolvedValueOnce({ rows });
  }

  function toRow(
    input: CreateEmployeeInput,
    id = 'emp-1',
    deletedAt: Date | null = null
  ): Row {
    return {
      id,
      employee_number: input.employeeNumber,
      first_name: input.firstName,
      last_name: input.lastName,
      email: input.email,
      manager_id: input.managerId ?? null,
      department: input.department ?? null,
      hire_date: input.hireDate,
      termination_date: input.terminationDate ?? null,
      employment_status: input.employmentStatus ?? EmploymentStatus.ACTIVE,
      created_at: now,
      updated_at: now,
      deleted_at: deletedAt,
    };
  }

  function expectedMapper(input: CreateEmployeeInput, id = 'emp-1'): Row {
    return {
      id,
      employeeNumber: input.employeeNumber,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      managerId: input.managerId ?? null,
      department: input.department ?? null,
      hireDate: input.hireDate,
      terminationDate: input.terminationDate ?? null,
      employmentStatus: input.employmentStatus ?? EmploymentStatus.ACTIVE,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
  }

  describe('create', () => {
    it('persists an employee and returns the mapped Employee', async () => {
      const input: CreateEmployeeInput = {
        employeeNumber: 'E001',
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@example.com',
        managerId: 'mgr-1',
        department: 'Engineering',
        hireDate: new Date('2026-01-01T00:00:00.000Z'),
        terminationDate: null,
        employmentStatus: EmploymentStatus.ACTIVE,
      };

      mockReturn([toRow(input)]);

      const result = await repo.create(input);

      expect(result).toEqual(expectedMapper(input));
      expect(poolQuery).toHaveBeenCalledTimes(1);
      expect(poolQuery.mock.calls[0][0]).toContain('INSERT INTO employees');
      const params = poolQuery.mock.calls[0][1] as unknown[];
      expect(params[1]).toBe('E001');
      expect(params[2]).toBe('Ada');
      expect(params[3]).toBe('Lovelace');
      expect(params[4]).toBe('ada@example.com');
      expect(params[5]).toBe('mgr-1');
      expect(params[6]).toBe('Engineering');
      expect(params[7]).toBe(input.hireDate);
      expect(params[8]).toBeNull();
      expect(params[9]).toBe(EmploymentStatus.ACTIVE);
    });

    it('defaults employmentStatus to ACTIVE and nulls manager/department when omitted', async () => {
      const input: CreateEmployeeInput = {
        employeeNumber: 'E002',
        firstName: 'Grace',
        lastName: 'Hopper',
        email: 'grace@example.com',
        hireDate: new Date('2026-01-01T00:00:00.000Z'),
      };

      mockReturn([toRow(input)]);

      const result = await repo.create(input);

      expect(result.employmentStatus).toBe(EmploymentStatus.ACTIVE);
      expect(result.managerId).toBeNull();
      expect(result.department).toBeNull();

      const params = poolQuery.mock.calls[0][1] as unknown[];
      expect(params[5]).toBeNull();
      expect(params[6]).toBeNull();
      expect(params[9]).toBe(EmploymentStatus.ACTIVE);
    });

    it('throws a UniqueConstraintError on a unique constraint violation', async () => {
      const input: CreateEmployeeInput = {
        employeeNumber: 'E001',
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@example.com',
        hireDate: new Date('2026-01-01T00:00:00.000Z'),
      };

      const err = Object.assign(new Error('duplicate key'), {
        code: '23505',
        constraint: 'employees_email_unique',
      });
      poolQuery.mockRejectedValue(err);

      await expect(repo.create(input)).rejects.toMatchObject({ code: 'DUPLICATE_EMPLOYEE' });
    });

    it('joins a caller transaction when a PoolClient is supplied', async () => {
      const client: FakeClient = { query: jest.fn() };
      const input: CreateEmployeeInput = {
        employeeNumber: 'E003',
        firstName: 'Katherine',
        lastName: 'Johnson',
        email: 'katherine@example.com',
        hireDate: new Date('2026-01-01T00:00:00.000Z'),
      };

      client.query.mockResolvedValueOnce({ rows: [toRow(input, 'emp-3')] });

      await repo.create(input, (client as unknown) as never);

      expect(client.query).toHaveBeenCalledTimes(1);
      expect(poolQuery).not.toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('returns null when no matching (non-deleted) row exists', async () => {
      mockReturn([]);
      await expect(repo.findById('emp-unknown')).resolves.toBeNull();
      expect(poolQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = $1 AND deleted_at IS NULL'),
        ['emp-unknown']
      );
    });

    it('maps an existing row to an Employee', async () => {
      const input: CreateEmployeeInput = {
        employeeNumber: 'E001',
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@example.com',
        hireDate: new Date('2026-01-01T00:00:00.000Z'),
      };
      mockReturn([toRow(input)]);

      const result = await repo.findById('emp-1');
      expect(result).toEqual(expectedMapper(input));
    });
  });

  describe('findByEmployeeNumber', () => {
    it('returns null when none exist', async () => {
      mockReturn([]);
      await expect(repo.findByEmployeeNumber('E999')).resolves.toBeNull();
      expect(poolQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE employee_number = $1 AND deleted_at IS NULL'),
        ['E999']
      );
    });
  });

  describe('findByEmail', () => {
    it('returns null when none exist', async () => {
      mockReturn([]);
      await expect(repo.findByEmail('nobody@example.com')).resolves.toBeNull();
      expect(poolQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE email = $1 AND deleted_at IS NULL'),
        ['nobody@example.com']
      );
    });
  });

  describe('findByManager', () => {
    it('returns an empty list when the manager has no reports', async () => {
      mockReturn([]);
      await expect(repo.findByManager('mgr-1')).resolves.toEqual([]);
      expect(poolQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE manager_id = $1 AND deleted_at IS NULL'),
        ['mgr-1']
      );
    });

    it('returns mapped rows for a manager with reports', async () => {
      const first: CreateEmployeeInput = {
        employeeNumber: 'E001',
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@example.com',
        managerId: 'mgr-1',
        hireDate: new Date('2026-01-01T00:00:00.000Z'),
      };
      const second: CreateEmployeeInput = {
        employeeNumber: 'E002',
        firstName: 'Grace',
        lastName: 'Hopper',
        email: 'grace@example.com',
        managerId: 'mgr-1',
        hireDate: new Date('2026-01-01T00:00:00.000Z'),
      };
      mockReturn([toRow(first, 'emp-a'), toRow(second, 'emp-b')]);

      const result = await repo.findByManager('mgr-1');
      expect(result.map((r) => r.id)).toEqual(['emp-a', 'emp-b']);
      expect(result.map((r) => r.managerId)).toEqual(['mgr-1', 'mgr-1']);
    });
  });

  describe('update', () => {
    it('updates only the supplied fields and returns the updated Employee', async () => {
      const input: CreateEmployeeInput = {
        employeeNumber: 'E001',
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@example.com',
        department: 'Research',
        hireDate: new Date('2026-01-01T00:00:00.000Z'),
      };

      mockReturn([toRow(input)]);

      const result = await repo.update('emp-1', { department: 'Research' });

      expect(result.department).toBe('Research');
      const sql = poolQuery.mock.calls[0][0] as string;
      expect(sql).toContain('UPDATE employees');
      expect(sql).toContain('department = $3');
      expect(sql).not.toContain('first_name =');
      const params = poolQuery.mock.calls[0][1] as unknown[];
      expect(params[0]).toBe('emp-1');
      expect(params[2]).toBe('Research');
    });

    it('throws EmployeeNotFoundError when the target row is missing', async () => {
      mockReturn([]);
      await expect(repo.update('emp-missing', { department: 'X' })).rejects.toBeInstanceOf(
        EmployeeNotFoundError
      );
    });

    it('throws a UniqueConstraintError on a unique constraint violation', async () => {
      const err = Object.assign(new Error('duplicate key'), {
        code: '23505',
        constraint: 'employees_email_unique',
      });
      poolQuery.mockRejectedValueOnce(err);

      await expect(repo.update('emp-1', { email: 'taken@example.com' })).rejects.toMatchObject({
        code: 'DUPLICATE_EMPLOYEE',
      });
    });
  });

  describe('softDelete', () => {
    it('sets deletedAt and returns the soft-deleted Employee', async () => {
      const input: CreateEmployeeInput = {
        employeeNumber: 'E001',
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@example.com',
        hireDate: new Date('2026-01-01T00:00:00.000Z'),
      };
      const row = toRow(input, 'emp-1', now);
      row.updated_at = now;
      row.deleted_at = now;
      mockReturn([row]);

      const result = await repo.softDelete('emp-1');

      expect(result.deletedAt).toEqual(now);
      expect(result.updatedAt).toEqual(now);
      const sql = poolQuery.mock.calls[0][0] as string;
      expect(sql).toContain('UPDATE employees');
      expect(sql).toContain('deleted_at = $2');
      expect(poolQuery.mock.calls[0][1][0]).toBe('emp-1');
    });

    it('throws EmployeeNotFoundError when the target row is missing', async () => {
      mockReturn([]);
      await expect(repo.softDelete('emp-missing')).rejects.toBeInstanceOf(EmployeeNotFoundError);
    });
  });
});
