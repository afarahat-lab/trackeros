import { AuditAction } from '../../../../src/shared/types';
import { AuditLogRepository } from '../../../../src/modules/audit/audit.repository';
import type { AuditLogInput } from '../../../../src/modules/audit/audit.model';

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

describe('AuditLogRepository', () => {
  const now = new Date('2026-03-01T12:00:00.000Z');

  let repo: AuditLogRepository;

  beforeEach(() => {
    poolQuery.mockReset();
    repo = new AuditLogRepository();
  });

  function mockReturn(rows: Row[]): void {
    poolQuery.mockResolvedValueOnce({ rows });
  }

  function toRow(input: AuditLogInput, id = 'audit-1'): Row {
    return {
      id,
      entity_type: input.entityType,
      entity_id: input.entityId,
      action: input.action,
      old_values: input.oldValues ?? null,
      new_values: input.newValues ?? null,
      performed_by: input.performedBy ?? null,
      performed_at: input.performedAt ?? now,
      created_at: now,
      updated_at: now,
    };
  }

  describe('record', () => {
    it('persists an entry and returns the mapped AuditLog', async () => {
      const input: AuditLogInput = {
        entityType: 'leave_request',
        entityId: 'lr-1',
        action: AuditAction.CREATE,
        oldValues: null,
        newValues: { status: 'PENDING' },
        performedBy: 'emp-9',
        performedAt: now,
      };

      mockReturn([toRow(input)]);

      const result = await repo.record(input);

      expect(result).toEqual({
        id: 'audit-1',
        entityType: 'leave_request',
        entityId: 'lr-1',
        action: AuditAction.CREATE,
        oldValues: null,
        newValues: { status: 'PENDING' },
        performedBy: 'emp-9',
        performedAt: now,
        createdAt: now,
        updatedAt: now,
      });

      expect(poolQuery).toHaveBeenCalledTimes(1);
      expect(poolQuery.mock.calls[0][0]).toContain('INSERT INTO audit_logs');
      const params = poolQuery.mock.calls[0][1] as unknown[];
      expect(params[1]).toBe('leave_request');
      expect(params[2]).toBe('lr-1');
      expect(params[3]).toBe(AuditAction.CREATE);
      expect(params[4]).toBeNull();
      expect(params[5]).toBe(JSON.stringify({ status: 'PENDING' }));
      expect(params[6]).toBe('emp-9');
    });

    it('defaults performedBy to null and performedAt to now when omitted', async () => {
      const before = Date.now();
      const input: AuditLogInput = {
        entityType: 'leave_policy',
        entityId: 'p-1',
        action: AuditAction.UPDATE,
      };

      const row = toRow(input);
      row.performed_at = new Date();
      mockReturn([row]);

      const result = await repo.record(input);

      expect(result.performedBy).toBeNull();
      expect(result.performedAt).toBeInstanceOf(Date);

      const params = poolQuery.mock.calls[0][1] as unknown[];
      expect(params[6]).toBeNull();
      expect(params[7]).toBeInstanceOf(Date);
      expect((params[8] as Date).getTime()).toBeGreaterThanOrEqual(before);
    });

    it('joins a caller transaction when a PoolClient is supplied', async () => {
      const client: FakeClient = { query: jest.fn() };

      const input: AuditLogInput = {
        entityType: 'leave_request',
        entityId: 'lr-2',
        action: AuditAction.APPROVE,
        oldValues: { status: 'PENDING' },
        newValues: { status: 'APPROVED' },
      };

      client.query.mockResolvedValueOnce({ rows: [toRow(input, 'audit-2')] });

      await repo.record(input, (client as unknown) as never);

      expect(client.query).toHaveBeenCalledTimes(1);
      // The shared pool must not be used when a client is supplied.
      expect(poolQuery).not.toHaveBeenCalled();
    });
  });

  describe('findByEntity', () => {
    it('returns an empty list when none exist', async () => {
      poolQuery.mockResolvedValueOnce({ rows: [] });
      await expect(repo.findByEntity('leave_request', 'lr-1')).resolves.toEqual([]);

      expect(poolQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE entity_type = $1 AND entity_id = $2'),
        ['leave_request', 'lr-1']
      );
    });

    it('maps rows for an entity with history', async () => {
      const first = toRow(
        {
          entityType: 'leave_request',
          entityId: 'lr-1',
          action: AuditAction.CREATE,
          performedAt: new Date('2026-01-01T00:00:00.000Z'),
        },
        'audit-a'
      );
      const second = toRow(
        {
          entityType: 'leave_request',
          entityId: 'lr-1',
          action: AuditAction.APPROVE,
          performedAt: new Date('2026-01-02T00:00:00.000Z'),
        },
        'audit-b'
      );
      mockReturn([first, second]);

      const result = await repo.findByEntity('leave_request', 'lr-1');

      expect(result.map((r) => r.id)).toEqual(['audit-a', 'audit-b']);
      expect(result.map((r) => r.action)).toEqual([
        AuditAction.CREATE,
        AuditAction.APPROVE,
      ]);
    });
  });

  describe('findByActor', () => {
    it('returns an empty list when the actor has no history', async () => {
      poolQuery.mockResolvedValueOnce({ rows: [] });
      await expect(repo.findByActor('emp-unknown')).resolves.toEqual([]);

      expect(poolQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE performed_by = $1'),
        ['emp-unknown']
      );
    });

    it('returns mapped rows for an actor', async () => {
      const row = toRow(
        {
          entityType: 'leave_request',
          entityId: 'lr-1',
          action: AuditAction.REJECT,
          performedBy: 'emp-5',
        },
        'audit-c'
      );
      mockReturn([row]);

      const result = await repo.findByActor('emp-5');
      expect(result[0].performedBy).toBe('emp-5');
      expect(result[0].action).toBe(AuditAction.REJECT);
    });
  });

  describe('findByTimeRange', () => {
    const from = new Date('2026-01-01T00:00:00.000Z');
    const to = new Date('2026-01-31T23:59:59.999Z');

    it('returns an empty list when the range has no entries', async () => {
      poolQuery.mockResolvedValueOnce({ rows: [] });
      await expect(repo.findByTimeRange(from, to)).resolves.toEqual([]);

      expect(poolQuery).toHaveBeenCalledWith(
        expect.stringContaining('performed_at >= $1 AND performed_at <= $2'),
        [from, to]
      );
    });

    it('returns mapped rows within the inclusive range', async () => {
      const row = toRow(
        {
          entityType: 'leave_request',
          entityId: 'lr-1',
          action: AuditAction.DELETE,
          performedAt: new Date('2026-01-15T00:00:00.000Z'),
        },
        'audit-d'
      );
      mockReturn([row]);

      const result = await repo.findByTimeRange(from, to);
      expect(result).toHaveLength(1);
      expect(result[0].action).toBe(AuditAction.DELETE);
    });
  });
});
