jest.mock('../../../../src/shared/db/connection', () => ({
  pool: { query: jest.fn() }
}));

import { PgLeaveBalanceRepository } from '../../../../src/modules/balance/balance.repository';
import {
  BalanceStatus,
  LeaveBalance
} from '../../../../src/modules/balance/balance.model';
import { pool } from '../../../../src/shared/db/connection';

const queryMock = (pool as unknown as { query: jest.Mock }).query;

function makeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'bal-1',
    employee_id: 'emp-1',
    policy_id: 'pol-1',
    fiscal_year: 2026,
    total_entitlement: 20,
    used_days: 3,
    pending_days: 5,
    status: 'ACTIVE' as BalanceStatus,
    created_at: new Date('2026-01-01T00:00:00Z'),
    updated_at: new Date('2026-01-01T00:00:00Z'),
    ...overrides
  };
}

function makeBalance(overrides: Partial<LeaveBalance> = {}): LeaveBalance {
  return {
    id: 'bal-1',
    employeeId: 'emp-1',
    policyId: 'pol-1',
    fiscalYear: 2026,
    totalEntitlement: 20,
    usedDays: 3,
    pendingDays: 5,
    remainingDays: 12,
    status: 'ACTIVE',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides
  };
}

describe('PgLeaveBalanceRepository', () => {
  let repo: PgLeaveBalanceRepository;

  beforeEach(() => {
    queryMock.mockReset();
    repo = new PgLeaveBalanceRepository();
  });

  describe('mapRow', () => {
    it('derives remainingDays as totalEntitlement - usedDays - pendingDays', async () => {
      queryMock.mockResolvedValue({ rows: [makeRow()] });

      const result = await repo.findById('bal-1');

      expect(result?.remainingDays).toBe(20 - 3 - 5);
    });

    it('does not read a persisted remaining_days column (recomputes)', async () => {
      const row = makeRow();
      // A stored `remaining_days` value must be ignored; it is not a column.
      (row as Record<string, unknown>).remaining_days = 999;
      queryMock.mockResolvedValue({ rows: [row] });

      const result = await repo.findById('bal-1');

      expect(result?.remainingDays).toBe(12);
    });
  });

  describe('create', () => {
    it('omits remaining_days from the INSERT and maps the returned row', async () => {
      queryMock.mockResolvedValue({ rows: [makeRow()] });

      await repo.create(makeBalance());

      const sql = queryMock.mock.calls[0][0] as string;
      expect(sql).not.toContain('remaining_days');
      expect(sql).toContain('total_entitlement');
      expect(sql).toContain('used_days');
      expect(sql).toContain('pending_days');
    });

    it('defaults to the shared pool when no client is passed', async () => {
      queryMock.mockResolvedValue({ rows: [makeRow()] });

      await repo.create(makeBalance());

      expect(queryMock).toHaveBeenCalledTimes(1);
    });

    it('uses the provided client for the query', async () => {
      const client = { query: jest.fn().mockResolvedValue({ rows: [makeRow()] }) };
      queryMock.mockResolvedValue({ rows: [makeRow()] });

      await repo.create(makeBalance(), client as never);

      expect(client.query).toHaveBeenCalledTimes(1);
      expect(queryMock).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('recomputes remainingDays from the updated counters', async () => {
      queryMock.mockResolvedValue({
        rows: [makeRow({ used_days: 8, pending_days: 2 })]
      });

      const result = await repo.update(makeBalance({ usedDays: 8, pendingDays: 2 }));

      expect(result.remainingDays).toBe(20 - 8 - 2);
    });
  });

  describe('findById / findByEmployeeAndYear', () => {
    it('returns null when no row is present', async () => {
      queryMock.mockResolvedValue({ rows: [] });

      await expect(repo.findById('missing')).resolves.toBeNull();
    });

    it('maps every row in a list', async () => {
      queryMock.mockResolvedValue({
        rows: [
          makeRow({ id: 'bal-1', used_days: 1, pending_days: 1 }),
          makeRow({ id: 'bal-2', used_days: 2, pending_days: 2 })
        ]
      });

      const results = await repo.findByEmployeeAndYear('emp-1', 2026);

      expect(results).toHaveLength(2);
      expect(results[0].remainingDays).toBe(20 - 1 - 1);
      expect(results[1].remainingDays).toBe(20 - 2 - 2);
    });

    it('filters by employee, policy and year', async () => {
      queryMock.mockResolvedValue({ rows: [makeRow()] });

      await repo.findByEmployeePolicyAndYear('emp-1', 'pol-1', 2026);

      expect(queryMock.mock.calls[0][1]).toEqual(['emp-1', 'pol-1', 2026]);
    });
  });
});
