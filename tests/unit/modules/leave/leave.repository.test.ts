import { Pool, PoolClient, QueryResult } from 'pg';
import { PgLeaveRequestRepository } from '../../../../src/modules/leave';
import { LeaveRequestQueryParams } from '../../../../src/shared/types';

const ROW = {
  id: 'lr-1',
  employee_id: 'emp-1',
  leave_type_code: 'annual',
  start_date: new Date('2024-06-01T00:00:00Z'),
  end_date: new Date('2024-06-03T00:00:00Z'),
  requested_days: 3,
  reason: null,
  status: 'DRAFT',
  approver_id: null,
  approval_comment: null,
  submitted_at: null,
  decided_at: null,
  cancelled_by: null,
  cancelled_at: null,
};

function capturePool(): { sql: string[]; params: unknown[][]; pool: Pool } {
  const sql: string[] = [];
  const params: unknown[][] = [];
  const pool = {
    query: async (text: string, values?: unknown[]) => {
      sql.push(text);
      params.push(values ?? []);
      return { rows: [ROW], rowCount: 1 } as QueryResult<never>;
    },
  } as unknown as Pool;
  return { sql, params, pool };
}

describe('PgLeaveRequestRepository.findByQuery', () => {
  it('passes employeeIds as a single ANY($n) parameter, not spread', async () => {
    const { sql, params, pool } = capturePool();
    const repo = new PgLeaveRequestRepository(pool);

    await repo.findByQuery({ employeeIds: ['emp-1', 'emp-2'] });

    expect(sql).toHaveLength(1);
    expect(sql[0]).toMatch(/employee_id = ANY\(\$\d+\)/);
    expect(params[0]).toHaveLength(1);
    expect(params[0][0]).toEqual(['emp-1', 'emp-2']);
  });

  it('omits ANY when employeeIds is empty', async () => {
    const { sql, pool } = capturePool();
    const repo = new PgLeaveRequestRepository(pool);

    await repo.findByQuery({ employeeIds: [] });

    expect(sql[0]).not.toContain('ANY(');
  });

  it('omits ANY when employeeIds is absent', async () => {
    const { sql, pool } = capturePool();
    const repo = new PgLeaveRequestRepository(pool);

    await repo.findByQuery({} as LeaveRequestQueryParams);

    expect(sql[0]).not.toContain('ANY(');
  });

  it('maps snake_case rows to camelCase LeaveRequest', async () => {
    const { pool } = capturePool();
    const repo = new PgLeaveRequestRepository(pool);

    const result = await repo.findByQuery({});

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: 'lr-1',
      employeeId: 'emp-1',
      leaveTypeCode: 'annual',
      startDate: ROW.start_date,
      endDate: ROW.end_date,
      requestedDays: 3,
      reason: null,
      status: 'DRAFT',
      approverId: null,
      approvalComment: null,
      submittedAt: null,
      decidedAt: null,
      cancelledBy: null,
      cancelledAt: null,
    });
    expect(result[0].startDate).toBeInstanceOf(Date);
    expect(result[0].status).toBe('DRAFT');
  });

  it('returns [] for an empty result set without throwing', async () => {
    const pool = {
      query: async () => ({ rows: [], rowCount: 0 } as QueryResult<never>),
    } as unknown as Pool;
    const repo = new PgLeaveRequestRepository(pool);

    const result = await repo.findByQuery({});

    expect(result).toEqual([]);
  });

  it('places ANY($n) before LIMIT/OFFSET and keeps scalars separate', async () => {
    const { sql, params, pool } = capturePool();
    const repo = new PgLeaveRequestRepository(pool);

    await repo.findByQuery({ employeeIds: ['emp-1', 'emp-2'], limit: 5, offset: 0 });

    const text = sql[0];
    expect(text).toMatch(/employee_id = ANY\(\$\d+\)/);
    expect(text).toContain('LIMIT $2');
    expect(text).toContain('OFFSET $3');
    expect(text.indexOf('ANY(')).toBeGreaterThan(-1);
    expect(text.indexOf('ANY(')).toBeLessThan(text.indexOf('LIMIT'));

    expect(params[0][0]).toEqual(['emp-1', 'emp-2']);
    expect(params[0][1]).toBe(5);
    expect(params[0][2]).toBe(0);
  });
});
