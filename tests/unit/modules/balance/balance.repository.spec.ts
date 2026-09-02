import { LeaveBalanceRepository } from '../../../../src/modules/balance/balance.repository';
import { BalanceNotFoundError, InsufficientBalanceError } from '../../../../src/modules/balance/balance.errors';
import type { CreateLeaveBalanceInput } from '../../../../src/modules/balance/balance.model';

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

describe('LeaveBalanceRepository', () => {
  const now = new Date('2026-03-01T12:00:00.000Z');

  let repo: LeaveBalanceRepository;

  beforeEach(() => {
    poolQuery.mockReset();
    repo = new LeaveBalanceRepository();
  });

  function mockReturn(rows: Row[]): void {
    poolQuery.mockResolvedValueOnce({ rows });
  }

  function toRow(input: CreateLeaveBalanceInput, id = 'bal-1'): Row {
    const usedDays = input.usedDays ?? 0;
    return {
      id,
      employee_id: input.employeeId,
      policy_id: input.policyId,
      total_entitlement: input.totalEntitlement,
      used_days: usedDays,
      remaining_days: input.totalEntitlement - usedDays,
      fiscal_year: input.fiscalYear,
      status: input.status ?? 'ACTIVE',
      created_at: now,
      updated_at: now,
    };
  }

  function expectedMapper(input: CreateLeaveBalanceInput, id = 'bal-1'): Row {
    const usedDays = input.usedDays ?? 0;
    return {
      id,
      employeeId: input.employeeId,
      policyId: input.policyId,
      totalEntitlement: input.totalEntitlement,
      usedDays,
      remainingDays: input.totalEntitlement - usedDays,
      fiscalYear: input.fiscalYear,
      status: input.status ?? 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    };
  }

  describe('create', () => {
    it('persists a balance and returns the mapped LeaveBalance', async () => {
      const input: CreateLeaveBalanceInput = {
        employeeId: 'emp-1',
        policyId: 'pol-1',
        totalEntitlement: 20,
        usedDays: 3,
        fiscalYear: 2026,
        status: 'ACTIVE',
      };

      mockReturn([toRow(input)]);

      const result = await repo.create(input);

      expect(result).toEqual(expectedMapper(input));
      expect(result.remainingDays).toBe(17);
      expect(poolQuery).toHaveBeenCalledTimes(1);
      expect(poolQuery.mock.calls[0][0]).toContain('INSERT INTO leave_balances');
      const params = poolQuery.mock.calls[0][1] as unknown[];
      expect(params[1]).toBe('emp-1');
      expect(params[2]).toBe('pol-1');
      expect(params[3]).toBe(20);
      expect(params[4]).toBe(3);
      expect(params[5]).toBe(17);
      expect(params[6]).toBe(2026);
      expect(params[7]).toBe('ACTIVE');
    });

    it('defaults usedDays to 0 and status to ACTIVE', async () => {
      const input: CreateLeaveBalanceInput = {
        employeeId: 'emp-1',
        policyId: 'pol-1',
        totalEntitlement: 10,
        fiscalYear: 2026,
      };

      mockReturn([toRow(input)]);

      const result = await repo.create(input);

      expect(result.usedDays).toBe(0);
      expect(result.remainingDays).toBe(10);
      expect(result.status).toBe('ACTIVE');

      const params = poolQuery.mock.calls[0][1] as unknown[];
      expect(params[4]).toBe(0);
      expect(params[5]).toBe(10);
      expect(params[7]).toBe('ACTIVE');
    });

    it('throws a UniqueConstraintError on a 23505 violation', async () => {
      const input: CreateLeaveBalanceInput = {
        employeeId: 'emp-1',
        policyId: 'pol-1',
        totalEntitlement: 20,
        fiscalYear: 2026,
      };
      const err = Object.assign(new Error('duplicate key'), { code: '23505' });
      poolQuery.mockRejectedValueOnce(err);

      await expect(repo.create(input)).rejects.toMatchObject({ code: 'DUPLICATE_BALANCE' });
    });

    it('joins a caller transaction when a PoolClient is supplied', async () => {
      const client: FakeClient = { query: jest.fn() };
      const input: CreateLeaveBalanceInput = {
        employeeId: 'emp-1',
        policyId: 'pol-1',
        totalEntitlement: 90,
        fiscalYear: 2026,
      };

      client.query.mockResolvedValueOnce({ rows: [toRow(input, 'bal-2')] });

      await repo.create(input, (client as unknown) as never);

      expect(client.query).toHaveBeenCalledTimes(1);
      expect(poolQuery).not.toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('returns null when no matching row exists', async () => {
      mockReturn([]);
      await expect(repo.findById('bal-unknown')).resolves.toBeNull();
      expect(poolQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = $1'),
        ['bal-unknown']
      );
    });

    it('maps an existing row to a LeaveBalance', async () => {
      const input: CreateLeaveBalanceInput = {
        employeeId: 'emp-1',
        policyId: 'pol-1',
        totalEntitlement: 20,
        fiscalYear: 2026,
      };
      mockReturn([toRow(input)]);

      const result = await repo.findById('bal-1');
      expect(result).toEqual(expectedMapper(input));
    });
  });

  describe('findByEmployee', () => {
    it('returns an empty list when none exist', async () => {
      mockReturn([]);
      await expect(repo.findByEmployee('emp-1')).resolves.toEqual([]);
      expect(poolQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE employee_id = $1'),
        ['emp-1']
      );
    });

    it('returns all mapped balances for an employee', async () => {
      const first: CreateLeaveBalanceInput = {
        employeeId: 'emp-1',
        policyId: 'pol-1',
        totalEntitlement: 20,
        fiscalYear: 2026,
      };
      const second: CreateLeaveBalanceInput = {
        employeeId: 'emp-1',
        policyId: 'pol-2',
        totalEntitlement: 10,
        fiscalYear: 2025,
      };
      mockReturn([toRow(first, 'bal-a'), toRow(second, 'bal-b')]);

      const result = await repo.findByEmployee('emp-1');
      expect(result.map((r) => r.id)).toEqual(['bal-a', 'bal-b']);
    });
  });

  describe('findByEmployeeAndPolicy', () => {
    it('returns balances scoped to employee and policy', async () => {
      const input: CreateLeaveBalanceInput = {
        employeeId: 'emp-1',
        policyId: 'pol-1',
        totalEntitlement: 20,
        fiscalYear: 2026,
      };
      mockReturn([toRow(input)]);

      const result = await repo.findByEmployeeAndPolicy('emp-1', 'pol-1');
      expect(result).toHaveLength(1);
      expect(poolQuery).toHaveBeenCalledWith(
        expect.stringContaining('employee_id = $1 AND policy_id = $2'),
        ['emp-1', 'pol-1']
      );
    });
  });

  describe('findByEmployeeAndFiscalYear', () => {
    it('returns null when no matching balance exists', async () => {
      mockReturn([]);
      await expect(repo.findByEmployeeAndFiscalYear('emp-1', 'pol-1', 2026)).resolves.toBeNull();
    });

    it('maps the matching row to a LeaveBalance', async () => {
      const input: CreateLeaveBalanceInput = {
        employeeId: 'emp-1',
        policyId: 'pol-1',
        totalEntitlement: 20,
        fiscalYear: 2026,
      };
      mockReturn([toRow(input)]);

      const result = await repo.findByEmployeeAndFiscalYear('emp-1', 'pol-1', 2026);
      expect(result).toEqual(expectedMapper(input));
    });
  });

  describe('update', () => {
    it('updates only the supplied fields and returns the updated balance', async () => {
      const input: CreateLeaveBalanceInput = {
        employeeId: 'emp-1',
        policyId: 'pol-1',
        totalEntitlement: 20,
        fiscalYear: 2026,
      };
      mockReturn([
        toRow({ ...input, totalEntitlement: 25 }),
      ]);

      const result = await repo.update('bal-1', { totalEntitlement: 25 });

      expect(result.totalEntitlement).toBe(25);
      const sql = poolQuery.mock.calls[0][0] as string;
      expect(sql).toContain('UPDATE leave_balances');
      expect(sql).toContain('total_entitlement = $3');
      expect(sql).not.toContain('used_days =');
      const params = poolQuery.mock.calls[0][1] as unknown[];
      expect(params[0]).toBe('bal-1');
      expect(params[2]).toBe(25);
    });

    it('throws BalanceNotFoundError when the target row is missing', async () => {
      mockReturn([]);
      await expect(repo.update('bal-missing', { usedDays: 1 })).rejects.toBeInstanceOf(
        BalanceNotFoundError
      );
    });

    it('throws a UniqueConstraintError on a 23505 violation', async () => {
      const err = Object.assign(new Error('duplicate key'), { code: '23505' });
      poolQuery.mockRejectedValueOnce(err);

      await expect(repo.update('bal-1', { fiscalYear: 2025 })).rejects.toMatchObject({
        code: 'DUPLICATE_BALANCE',
      });
    });
  });

  describe('commitDays', () => {
    const baseInput: CreateLeaveBalanceInput = {
      employeeId: 'emp-1',
      policyId: 'pol-1',
      totalEntitlement: 20,
      usedDays: 3,
      fiscalYear: 2026,
    };

    it('atomically debits used_days and credits down remaining_days', async () => {
      mockReturn([{ ...toRow(baseInput), used_days: 5, remaining_days: 15 }]);

      const result = await repo.commitDays('emp-1', 'pol-1', 2026, 2);

      expect(result.usedDays).toBe(5);
      expect(result.remainingDays).toBe(15);
      const sql = poolQuery.mock.calls[0][0] as string;
      expect(sql).toContain('UPDATE leave_balances');
      expect(sql).toContain('remaining_days >= $4');
      const params = poolQuery.mock.calls[0][1] as unknown[];
      expect(params[0]).toBe('emp-1');
      expect(params[1]).toBe('pol-1');
      expect(params[2]).toBe(2026);
      expect(params[3]).toBe(2);
    });

    it('throws InsufficientBalanceError when the commit would drive remainingDays below zero', async () => {
      mockReturn([]);
      mockReturn([toRow(baseInput)]);

      await expect(repo.commitDays('emp-1', 'pol-1', 2026, 99)).rejects.toBeInstanceOf(
        InsufficientBalanceError
      );
    });

    it('throws BalanceNotFoundError when no matching balance row exists', async () => {
      mockReturn([]);
      mockReturn([]);

      await expect(repo.commitDays('emp-x', 'pol-1', 2026, 1)).rejects.toBeInstanceOf(
        BalanceNotFoundError
      );
    });

    it('joins a caller transaction when a PoolClient is supplied', async () => {
      const client: FakeClient = { query: jest.fn() };
      client.query.mockResolvedValueOnce({
        rows: [{ ...toRow(baseInput), used_days: 5, remaining_days: 15 }],
      });

      const result = await repo.commitDays('emp-1', 'pol-1', 2026, 2, (client as unknown) as never);

      expect(result.remainingDays).toBe(15);
      expect(client.query).toHaveBeenCalledTimes(1);
      expect(poolQuery).not.toHaveBeenCalled();
    });
  });
});
