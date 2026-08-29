jest.mock('../../../../src/shared/db/connection', () => ({
  pool: { query: jest.fn() }
}));

import { PgAuditLogRepository } from '../../../../src/modules/audit/audit.repository';
import { AuditLog } from '../../../../src/modules/audit/audit.model';
import { pool } from '../../../../src/shared/db/connection';

const queryMock = (pool as unknown as { query: jest.Mock }).query;

function makeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'audit-1',
    entity_type: 'LeaveRequest',
    entity_id: 'req-1',
    action: 'APPROVE',
    old_values: { status: 'PENDING' },
    new_values: { status: 'APPROVED' },
    performed_by: 'mgr-1',
    performed_at: new Date('2026-01-01T00:00:00Z'),
    ...overrides
  };
}

function makeLog(overrides: Partial<AuditLog> = {}): AuditLog {
  return {
    id: 'audit-1',
    entityType: 'LeaveRequest',
    entityId: 'req-1',
    action: 'APPROVE',
    oldValues: { status: 'PENDING' },
    newValues: { status: 'APPROVED' },
    performedBy: 'mgr-1',
    performedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides
  };
}

describe('PgAuditLogRepository', () => {
  let repo: PgAuditLogRepository;

  beforeEach(() => {
    queryMock.mockReset();
    repo = new PgAuditLogRepository();
  });

  describe('mapRow action fallback', () => {
    it('preserves a recognized action', async () => {
      queryMock.mockResolvedValue({ rows: [makeRow({ action: 'CANCEL' })] });

      const result = await repo.findById('audit-1');

      expect(result?.action).toBe('CANCEL');
    });

    it('falls back to UPDATE for an unknown action', async () => {
      queryMock.mockResolvedValue({ rows: [makeRow({ action: 'MYSTERY' })] });

      const result = await repo.findById('audit-1');

      expect(result?.action).toBe('UPDATE');
    });
  });

  describe('create', () => {
    it('maps the row and preserves nullable performedBy', async () => {
      queryMock.mockResolvedValue({ rows: [makeRow({ performed_by: null })] });

      const result = await repo.create(makeLog({ performedBy: null }));

      expect(result.performedBy).toBeNull();
    });

    it('uses the provided client when given', async () => {
      const client = { query: jest.fn().mockResolvedValue({ rows: [makeRow()] }) };
      queryMock.mockResolvedValue({ rows: [makeRow()] });

      await repo.create(makeLog(), client as never);

      expect(client.query).toHaveBeenCalledTimes(1);
      expect(queryMock).not.toHaveBeenCalled();
    });
  });

  describe('findById / findByEntity', () => {
    it('returns null when no row is present', async () => {
      queryMock.mockResolvedValue({ rows: [] });

      await expect(repo.findById('missing')).resolves.toBeNull();
    });

    it('maps a list ordered by performedAt', async () => {
      queryMock.mockResolvedValue({
        rows: [
          makeRow({ id: 'audit-1', action: 'SUBMIT' }),
          makeRow({ id: 'audit-2', action: 'APPROVE' })
        ]
      });

      const results = await repo.findByEntity('LeaveRequest', 'req-1');

      expect(results).toHaveLength(2);
      expect(results.map((l) => l.action)).toEqual(['SUBMIT', 'APPROVE']);
      expect(queryMock.mock.calls[0][1]).toEqual(['LeaveRequest', 'req-1']);
    });
  });

  describe('immutability surface', () => {
    it('exposes only create and read methods (no update/delete)', () => {
      const keys = Object.getOwnPropertyNames(
        PgAuditLogRepository.prototype
      ).filter((k) => k !== 'constructor');

      expect(keys).toEqual(expect.arrayContaining(['create', 'findById', 'findByEntity']));
      expect(keys).not.toEqual(expect.arrayContaining(['update', 'delete']));
    });
  });
});
