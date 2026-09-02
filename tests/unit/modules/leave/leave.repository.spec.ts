import type { Pool, PoolClient } from 'pg';

import { LeaveRequestRepository } from '../../../../src/modules/leave/leave.repository';
import { LeaveStatus, LeaveType } from '../../../../src/shared/types';
import type { LeaveRequest } from '../../../../src/modules/leave/leave.model';

jest.mock('../../../../src/shared/db', () => {
  const query = jest.fn();
  return { pool: { query } as unknown as Pool };
});

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { pool } = require('../../../../src/shared/db') as { pool: { query: jest.Mock } };

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: 'lr-1',
    employee_id: 'emp-1',
    leave_type: 'annual',
    start_date: new Date('2026-06-01T00:00:00.000Z'),
    end_date: new Date('2026-06-03T00:00:00.000Z'),
    reason: 'vacation',
    status: 'PENDING',
    approved_by: null,
    approved_at: null,
    created_at: new Date('2026-03-01T00:00:00.000Z'),
    updated_at: new Date('2026-03-01T00:00:00.000Z'),
    ...overrides,
  };
}

describe('LeaveRequestRepository', () => {
  const repo = new LeaveRequestRepository();

  beforeEach(() => {
    pool.query.mockReset();
  });

  describe('create', () => {
    it('inserts a PENDING request with parameterized SQL', async () => {
      pool.query.mockResolvedValue({ rows: [row()] });

      const created = await repo.create({
        employeeId: 'emp-1',
        leaveType: LeaveType.annual,
        startDate: new Date('2026-06-01T00:00:00.000Z'),
        endDate: new Date('2026-06-03T00:00:00.000Z'),
        reason: 'vacation',
      });

      expect(pool.query).toHaveBeenCalledTimes(1);
      const [sql, params] = pool.query.mock.calls[0];
      expect(sql).toContain('INSERT INTO leave_requests');
      expect(sql).toContain('$1');
      expect(params[1]).toBe('emp-1');
      expect(params[2]).toBe('annual');
      expect(params[6]).toBe('PENDING');
      expect(created.status).toBe(LeaveStatus.PENDING);
      expect(created.id).toBe('lr-1');
    });

    it('uses the supplied client for the insert', async () => {
      const client = { query: jest.fn().mockResolvedValue({ rows: [row()] }) } as unknown as PoolClient;
      await repo.create(
        {
          employeeId: 'emp-1',
          leaveType: LeaveType.annual,
          startDate: new Date('2026-06-01T00:00:00.000Z'),
          endDate: new Date('2026-06-03T00:00:00.000Z'),
          reason: undefined,
        },
        client
      );

      expect(client.query).toHaveBeenCalledTimes(1);
      expect(pool.query).not.toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('maps a found row', async () => {
      pool.query.mockResolvedValue({ rows: [row()] });
      await expect(repo.findById('lr-1')).resolves.toMatchObject({ id: 'lr-1', reason: 'vacation' });
    });

    it('returns null when no row exists', async () => {
      pool.query.mockResolvedValue({ rows: [] });
      await expect(repo.findById('missing')).resolves.toBeNull();
    });
  });

  describe('update', () => {
    it('updates only the supplied fields and returns the mapped row', async () => {
      pool.query.mockResolvedValue({
        rows: [row({ status: 'APPROVED', approved_by: 'mgr-1', approved_at: new Date() })],
      });

      const updated = await repo.update('lr-1', {
        status: LeaveStatus.APPROVED,
        approvedBy: 'mgr-1',
        approvedAt: new Date('2026-03-02T00:00:00.000Z'),
      });

      expect(updated.status).toBe(LeaveStatus.APPROVED);
      expect(updated.approvedBy).toBe('mgr-1');

      const [sql, params] = pool.query.mock.calls[0];
      expect(sql).toContain('UPDATE leave_requests');
      expect(sql).toContain('status = ');
      expect(sql).toContain('approved_by = ');
    });

    it('throws LEAVE_NOT_FOUND when no row is updated', async () => {
      pool.query.mockResolvedValue({ rows: [] });
      await expect(repo.update('missing', { status: LeaveStatus.CANCELLED })).rejects.toMatchObject({
        code: 'LEAVE_NOT_FOUND',
      });
    });
  });

  describe('findByEmployee / findByStatus', () => {
    it('maps multiple rows', async () => {
      pool.query.mockResolvedValue({ rows: [row(), row({ id: 'lr-2' })] });
      await expect(repo.findByEmployee('emp-1')).resolves.toHaveLength(2);
      expect(pool.query).toHaveBeenCalledTimes(1);
    });
  });
});
