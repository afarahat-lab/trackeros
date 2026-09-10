import { Pool, PoolClient } from 'pg';
import { PgLeaveBalanceRepository } from '../../../../src/modules/balance';
import { LeaveTypeCode } from '../../../../src/shared/types';

/**
 * Regression cover for the lost-update race on leave balances.
 *
 * The balance deltas are computed in application code (read pendingDays, subtract,
 * write the result). Under PostgreSQL's default READ COMMITTED two concurrent
 * decisions can both read the same pendingDays and the second write silently
 * discards the first — being inside a transaction does NOT prevent it. The read that
 * precedes a write therefore has to take a row-level lock.
 */

const ROW = {
  id: 'balance-1',
  employee_id: 'emp-1',
  leave_type_code: LeaveTypeCode.ANNUAL,
  period_start: new Date('2026-01-01T00:00:00Z'),
  period_end: new Date('2026-12-31T00:00:00Z'),
  entitled_days: 20,
  used_days: 3,
  pending_days: 2,
};

/** Captures the SQL the repository actually sends. */
function recorder(): { sql: string[]; client: PoolClient } {
  const sql: string[] = [];
  const client = {
    query: async (text: string) => {
      sql.push(text);
      return { rows: [ROW], rowCount: 1 };
    },
  } as unknown as PoolClient;
  return { sql, client };
}

const repo = () => new PgLeaveBalanceRepository({} as unknown as Pool);

describe('PgLeaveBalanceRepository row locking', () => {
  it('locks the row when a transactional read precedes a write (findByKey)', async () => {
    const { sql, client } = recorder();
    await repo().findByKey(
      'emp-1',
      LeaveTypeCode.ANNUAL,
      ROW.period_start,
      ROW.period_end,
      client,
      true
    );
    expect(sql).toHaveLength(1);
    expect(sql[0]).toMatch(/FOR UPDATE/);
  });

  it('locks the row when a transactional read precedes a write (findById)', async () => {
    const { sql, client } = recorder();
    await repo().findById('balance-1', client, true);
    expect(sql[0]).toMatch(/FOR UPDATE/);
  });

  it('does NOT lock a validation-only read, so it cannot block a decision', async () => {
    const { sql, client } = recorder();
    await repo().findByKey(
      'emp-1',
      LeaveTypeCode.ANNUAL,
      ROW.period_start,
      ROW.period_end,
      client,
      false
    );
    expect(sql[0]).not.toMatch(/FOR UPDATE/);
  });

  it('omits the lock outside a transaction — it would imply a guarantee that does not exist', async () => {
    // No client => the pool runs an implicit single-statement transaction and the lock
    // is released before the caller could act on it. Emitting FOR UPDATE there would
    // read as protection while providing none.
    const sql: string[] = [];
    const pool = {
      query: async (text: string) => {
        sql.push(text);
        return { rows: [ROW], rowCount: 1 };
      },
    } as unknown as Pool;
    await new PgLeaveBalanceRepository(pool).findById('balance-1', undefined, true);
    expect(sql[0]).not.toMatch(/FOR UPDATE/);
  });

  it('defaults to no lock, so existing readers are unaffected', async () => {
    const { sql, client } = recorder();
    await repo().findById('balance-1', client);
    expect(sql[0]).not.toMatch(/FOR UPDATE/);
  });
});
