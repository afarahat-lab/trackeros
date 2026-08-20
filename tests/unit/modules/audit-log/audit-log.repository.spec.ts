import { PgAuditLogRepository } from '../../../../src/modules/audit-log/audit-log.repository';
import { AuditLog } from '../../../../src/modules/audit-log/audit-log.model';

jest.mock('../../../../src/shared/db/connection', () => ({
  pool: {
    query: jest.fn(),
  },
}));

import { pool } from '../../../../src/shared/db/connection';

const mockQuery = pool.query as jest.Mock;

function makeAuditLogRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: overrides.id ?? 'log-1',
    entity_type: overrides.entity_type ?? 'balance',
    entity_id: overrides.entity_id ?? 'bal-1',
    action: overrides.action ?? 'deduct',
    performed_by: overrides.performed_by ?? 'user-1',
    changes: (overrides.changes ?? { deducted: 5 }) as Record<string, unknown>,
    created_at: overrides.created_at ?? new Date('2026-01-15T10:00:00Z'),
  };
}

function makeAuditLog(overrides: Partial<AuditLog> = {}): AuditLog {
  return {
    id: 'log-1',
    entityType: 'balance',
    entityId: 'bal-1',
    action: 'deduct',
    performedBy: 'user-1',
    changes: { deducted: 5 },
    createdAt: new Date('2026-01-15T10:00:00Z'),
    ...overrides,
  };
}

describe('PgAuditLogRepository', () => {
  let repo: PgAuditLogRepository;

  beforeEach(() => {
    repo = new PgAuditLogRepository();
    mockQuery.mockReset();
  });

  describe('findByEntity', () => {
    it('should return audit logs for a given entity type and id', async () => {
      const row = makeAuditLogRow();
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.findByEntity('balance', 'bal-1');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(makeAuditLog());
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM audit_logs WHERE entity_type = $1 AND entity_id = $2 ORDER BY created_at DESC',
        ['balance', 'bal-1'],
      );
    });

    it('should return empty array when no logs exist for entity', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findByEntity('balance', 'nonexistent');

      expect(result).toEqual([]);
    });

    it('should return multiple logs ordered by created_at DESC', async () => {
      const row1 = makeAuditLogRow({
        id: 'log-1',
        created_at: new Date('2026-01-10T00:00:00Z'),
      });
      const row2 = makeAuditLogRow({
        id: 'log-2',
        created_at: new Date('2026-01-15T00:00:00Z'),
      });
      mockQuery.mockResolvedValueOnce({ rows: [row2, row1] });

      const result = await repo.findByEntity('balance', 'bal-1');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('log-2');
      expect(result[1].id).toBe('log-1');
    });
  });

  describe('create', () => {
    it('should insert a new audit log and return the created AuditLog', async () => {
      const input = {
        entityType: 'balance',
        entityId: 'bal-1',
        action: 'deduct',
        performedBy: 'user-1',
        changes: { deducted: 5 },
      };
      const row = makeAuditLogRow();
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.create(input);

      expect(result).toEqual(makeAuditLog());
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO audit_logs'),
        ['balance', 'bal-1', 'deduct', 'user-1', { deducted: 5 }],
      );
    });
  });

  describe('findAll', () => {
    it('should return all audit logs when no filters provided', async () => {
      const row1 = makeAuditLogRow({ id: 'log-1' });
      const row2 = makeAuditLogRow({ id: 'log-2', entity_type: 'leave_request' });
      mockQuery.mockResolvedValueOnce({ rows: [row1, row2] });

      const result = await repo.findAll();

      expect(result).toHaveLength(2);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM audit_logs  ORDER BY created_at DESC',
        [],
      );
    });

    it('should filter by entityType when provided', async () => {
      const row = makeAuditLogRow();
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.findAll({ entityType: 'balance' });

      expect(result).toHaveLength(1);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('entity_type = $1'),
        ['balance'],
      );
    });

    it('should filter by performedBy when provided', async () => {
      const row = makeAuditLogRow();
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.findAll({ performedBy: 'user-1' });

      expect(result).toHaveLength(1);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('performed_by = $1'),
        ['user-1'],
      );
    });

    it('should filter by fromDate when provided', async () => {
      const row = makeAuditLogRow();
      mockQuery.mockResolvedValueOnce({ rows: [row] });
      const fromDate = new Date('2026-01-01');

      const result = await repo.findAll({ fromDate });

      expect(result).toHaveLength(1);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('created_at >= $1'),
        [fromDate],
      );
    });

    it('should filter by toDate when provided', async () => {
      const row = makeAuditLogRow();
      mockQuery.mockResolvedValueOnce({ rows: [row] });
      const toDate = new Date('2026-12-31');

      const result = await repo.findAll({ toDate });

      expect(result).toHaveLength(1);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('created_at <= $1'),
        [toDate],
      );
    });

    it('should combine multiple filters', async () => {
      const row = makeAuditLogRow();
      mockQuery.mockResolvedValueOnce({ rows: [row] });
      const fromDate = new Date('2026-01-01');
      const toDate = new Date('2026-12-31');

      const result = await repo.findAll({
        entityType: 'balance',
        performedBy: 'user-1',
        fromDate,
        toDate,
      });

      expect(result).toHaveLength(1);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('entity_type = $1 AND performed_by = $2 AND created_at >= $3 AND created_at <= $4'),
        ['balance', 'user-1', fromDate, toDate],
      );
    });

    it('should return empty array when no logs match filters', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findAll({ entityType: 'nonexistent' });

      expect(result).toEqual([]);
    });
  });
});
